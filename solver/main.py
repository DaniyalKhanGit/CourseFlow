from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from sample_data import get_all_courses, get_courses_by_ids
from solver import Preferences, solve_schedules

app = FastAPI(title="ScheduleAI Solver")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class SolveRequest(BaseModel):
    course_ids: list[str]
    preferences: dict | None = None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/courses")
def list_courses():
    """Return all available courses and their sections."""
    courses = get_all_courses()
    return [c.model_dump() for c in courses]


@app.post("/solve")
def solve(req: SolveRequest):
    """Find and rank valid schedules for the selected courses."""
    courses = get_courses_by_ids(req.course_ids)
    if not courses:
        return {"schedules": [], "error": "No matching courses found"}

    # Build preferences from request
    pref_data = req.preferences or {}
    prefs = Preferences(
        time_preference=pref_data.get("time_preference", "none"),
        prefer_best_professors=pref_data.get("prefer_best_professors", 0.5),
        minimize_gaps=pref_data.get("minimize_gaps", 0.3),
        prefer_days_off=pref_data.get("prefer_days_off", []),
        avoid_early=pref_data.get("avoid_early", False),
        avoid_late=pref_data.get("avoid_late", False),
    )

    schedules = solve_schedules(courses, prefs, max_results=5)
    return {"schedules": schedules, "total_found": len(schedules)}
