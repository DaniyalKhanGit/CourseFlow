"""
Schedule solver using OR-Tools CP-SAT.

Takes a list of courses (each with multiple sections) and preferences,
then finds all valid (non-overlapping) schedules ranked by a weighted objective.
"""

from ortools.sat.python import cp_model

from sample_data import Section, Course, get_travel_minutes


# Map days to integers for overlap checking
DAY_INDEX = {"Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4}


def time_to_minutes(t: str) -> int:
    """Convert 'HH:MM' to minutes since midnight."""
    h, m = t.split(":")
    return int(h) * 60 + int(m)


def sections_overlap(a: Section, b: Section) -> bool:
    """Check if two sections have any time overlap."""
    shared_days = set(a.days) & set(b.days)
    if not shared_days:
        return False
    a_start, a_end = time_to_minutes(a.start_time), time_to_minutes(a.end_time)
    b_start, b_end = time_to_minutes(b.start_time), time_to_minutes(b.end_time)
    return a_start < b_end and b_start < a_end


class Preferences:
    """Structured preferences that affect schedule ranking."""

    def __init__(
        self,
        time_preference: str = "none",  # "morning", "afternoon", "evening", "none"
        prefer_best_professors: float = 0.5,  # 0.0-1.0 weight
        minimize_gaps: float = 0.3,  # 0.0-1.0 weight
        prefer_days_off: list[str] | None = None,  # e.g. ["Fri"]
        avoid_early: bool = False,  # avoid before 10am
        avoid_late: bool = False,  # avoid after 16:00
    ):
        self.time_preference = time_preference
        self.prefer_best_professors = prefer_best_professors
        self.minimize_gaps = minimize_gaps
        self.prefer_days_off = prefer_days_off or []
        self.avoid_early = avoid_early
        self.avoid_late = avoid_late


def _score_schedule(
    sections: list[Section], prefs: Preferences
) -> float:
    """
    Score a schedule from 0-100. Higher is better.
    This is used to rank valid schedules after the solver finds them.
    """
    score = 50.0  # base score

    # Professor rating component (0-25 points)
    ratings = [s.professor_rating for s in sections if s.professor_rating is not None]
    if ratings:
        avg_rating = sum(ratings) / len(ratings)
        # Scale: 1.0->0, 5.0->25
        prof_score = (avg_rating - 1.0) / 4.0 * 25.0
        score += prof_score * prefs.prefer_best_professors

    # Time preference component (0-15 points)
    if prefs.time_preference != "none":
        time_score = 0.0
        for s in sections:
            start = time_to_minutes(s.start_time)
            if prefs.time_preference == "morning" and start < 720:  # before noon
                time_score += 1
            elif prefs.time_preference == "afternoon" and 720 <= start < 960:
                time_score += 1
        time_score = (time_score / len(sections)) * 15.0
        score += time_score

    # Early/late avoidance (penalty up to -10)
    for s in sections:
        start = time_to_minutes(s.start_time)
        end = time_to_minutes(s.end_time)
        if prefs.avoid_early and start < 600:  # before 10am
            score -= 5
        if prefs.avoid_late and end > 960:  # after 4pm
            score -= 5

    # Gap minimization component (-15 to 0 points)
    if prefs.minimize_gaps > 0:
        total_gap = 0
        for day in ["Mon", "Tue", "Wed", "Thu", "Fri"]:
            day_sections = sorted(
                [s for s in sections if day in s.days],
                key=lambda s: time_to_minutes(s.start_time),
            )
            for i in range(1, len(day_sections)):
                gap = time_to_minutes(day_sections[i].start_time) - time_to_minutes(
                    day_sections[i - 1].end_time
                )
                total_gap += gap
        # Penalize: 0 gap -> 0 penalty, 300min gap -> -15
        gap_penalty = min(total_gap / 300.0, 1.0) * 15.0
        score -= gap_penalty * prefs.minimize_gaps

    # Days off preference (0-10 points)
    if prefs.prefer_days_off:
        used_days = set()
        for s in sections:
            used_days.update(s.days)
        days_off_achieved = sum(
            1 for d in prefs.prefer_days_off if d not in used_days
        )
        score += (days_off_achieved / len(prefs.prefer_days_off)) * 10.0

    # Travel time penalty (-15 to 0 points)
    # Penalize tight transitions between buildings
    travel_penalty = 0.0
    for day in ["Mon", "Tue", "Wed", "Thu", "Fri"]:
        day_sections = sorted(
            [s for s in sections if day in s.days],
            key=lambda s: time_to_minutes(s.start_time),
        )
        for i in range(1, len(day_sections)):
            gap_min = time_to_minutes(day_sections[i].start_time) - time_to_minutes(
                day_sections[i - 1].end_time
            )
            travel = get_travel_minutes(day_sections[i - 1].room, day_sections[i].room)
            if travel > 0:
                slack = gap_min - travel
                if slack < 0:
                    # Impossible transition — heavy penalty
                    travel_penalty += 10
                elif slack < 5:
                    # Very tight — moderate penalty
                    travel_penalty += 3
                elif slack < 10:
                    # Somewhat tight — small penalty
                    travel_penalty += 1
    score -= min(travel_penalty, 15.0)

    return round(max(0, min(100, score)), 2)


def _section_hits_blocked(section: Section, blocked_slots: list[dict]) -> bool:
    """Check if a section overlaps with any blocked time slot."""
    for slot in blocked_slots:
        shared_days = set(section.days) & set(slot["days"])
        if not shared_days:
            continue
        s_start = time_to_minutes(section.start_time)
        s_end = time_to_minutes(section.end_time)
        b_start = time_to_minutes(slot["start_time"])
        b_end = time_to_minutes(slot["end_time"])
        if s_start < b_end and b_start < s_end:
            return True
    return False


def solve_schedules(
    courses: list[Course],
    prefs: Preferences | None = None,
    max_results: int = 5,
    required_ids: list[str] | None = None,
    wanted_ids: list[str] | None = None,
    blocked_slots: list[dict] | None = None,
) -> list[dict]:
    """
    Find valid schedules for the given courses, respecting required/wanted
    distinction and blocked time slots.

    - Required courses must appear in every schedule.
    - Wanted courses are included when possible (best-effort).
    - Blocked time slots are hard constraints — no section may overlap them.
    """
    if prefs is None:
        prefs = Preferences()

    if not courses:
        return []

    blocked_slots = blocked_slots or []
    required_ids = set(required_ids or [])
    wanted_ids = set(wanted_ids or [])

    # If neither is specified, treat all as required (backward compat)
    if not required_ids and not wanted_ids:
        required_ids = {c.course_id for c in courses}

    required_courses = [c for c in courses if c.course_id in required_ids]
    wanted_courses = [c for c in courses if c.course_id in wanted_ids]

    # Try with all courses first, then drop wanted courses on failure
    best_results = _solve_inner(
        required_courses + wanted_courses, prefs, max_results, blocked_slots
    )

    # If no results and there are wanted courses, try dropping wanted one at a time
    if not best_results and wanted_courses:
        # Try with just required
        best_results = _solve_inner(required_courses, prefs, max_results, blocked_slots)

    # Tag sections with required/wanted status
    for result in best_results:
        for section in result["sections"]:
            section["priority"] = (
                "required" if section["course_id"] in required_ids else "wanted"
            )

    return best_results


def _solve_inner(
    courses: list[Course],
    prefs: Preferences,
    max_results: int,
    blocked_slots: list[dict],
) -> list[dict]:
    """Core solver: find all valid non-overlapping schedules."""
    if not courses:
        return []

    # Build a flat list of all sections with their course index
    all_sections: list[Section] = []
    course_section_ranges: list[tuple[int, int]] = []

    for course in courses:
        start = len(all_sections)
        all_sections.extend(course.sections)
        course_section_ranges.append((start, len(all_sections)))

    model = cp_model.CpModel()

    section_vars = [
        model.new_bool_var(f"sec_{i}_{all_sections[i].section_id}")
        for i in range(len(all_sections))
    ]

    # Constraint 1: Exactly one section per course
    for start, end in course_section_ranges:
        model.add_exactly_one(section_vars[start:end])

    # Constraint 2: No time overlaps between selected sections
    for i in range(len(all_sections)):
        for j in range(i + 1, len(all_sections)):
            same_course = any(
                start <= i < end and start <= j < end
                for start, end in course_section_ranges
            )
            if same_course:
                continue
            if sections_overlap(all_sections[i], all_sections[j]):
                model.add(section_vars[i] + section_vars[j] <= 1)

    # Constraint 3: Blocked time slots — disallow any section that overlaps
    for i, section in enumerate(all_sections):
        if _section_hits_blocked(section, blocked_slots):
            model.add(section_vars[i] == 0)

    # Constraint 4: Travel time — reject pairs where gap < travel time
    for i in range(len(all_sections)):
        for j in range(i + 1, len(all_sections)):
            # Only constrain sections from different courses
            same_course = any(
                start <= i < end and start <= j < end
                for start, end in course_section_ranges
            )
            if same_course:
                continue
            shared_days = set(all_sections[i].days) & set(all_sections[j].days)
            if not shared_days:
                continue
            travel = get_travel_minutes(all_sections[i].room, all_sections[j].room)
            if travel == 0:
                continue
            # Check both orderings (i before j, j before i)
            i_end = time_to_minutes(all_sections[i].end_time)
            j_start = time_to_minutes(all_sections[j].start_time)
            j_end = time_to_minutes(all_sections[j].end_time)
            i_start = time_to_minutes(all_sections[i].start_time)
            # If i ends before j starts but gap < travel, they can't coexist
            if i_end <= j_start and (j_start - i_end) < travel:
                model.add(section_vars[i] + section_vars[j] <= 1)
            elif j_end <= i_start and (i_start - j_end) < travel:
                model.add(section_vars[i] + section_vars[j] <= 1)

    # Enumerate all solutions
    class SolutionCollector(cp_model.CpSolverSolutionCallback):
        def __init__(self) -> None:
            super().__init__()
            self.solutions: list[list[int]] = []

        def on_solution_callback(self) -> None:
            solution = [
                i for i in range(len(section_vars)) if self.value(section_vars[i])
            ]
            self.solutions.append(solution)

    solver = cp_model.CpSolver()
    solver.parameters.enumerate_all_solutions = True
    collector = SolutionCollector()
    solver.solve(model, collector)

    results = []
    for solution_indices in collector.solutions:
        sections = [all_sections[i] for i in solution_indices]
        schedule_score = _score_schedule(sections, prefs)
        results.append(
            {
                "sections": [s.model_dump() for s in sections],
                "score": schedule_score,
            }
        )

    results.sort(key=lambda r: r["score"], reverse=True)
    return results[:max_results]
