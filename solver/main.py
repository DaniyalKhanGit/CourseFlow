import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

from sample_data import get_all_courses, get_courses_by_ids, Section, Course
from solver import Preferences, solve_schedules

# --- Supabase setup (via PostgREST / httpx) ---
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
_supabase_ok = bool(SUPABASE_URL and SUPABASE_KEY)
if _supabase_ok:
    print(f"Supabase configured: {SUPABASE_URL}")


def _fetch_supabase_courses() -> list[Course] | None:
    """Fetch all sections from Supabase via PostgREST. Returns None on failure."""
    if not _supabase_ok:
        return None
    try:
        url = f"{SUPABASE_URL}/rest/v1/sections?select=*"
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        }
        resp = httpx.get(url, headers=headers, timeout=10)
        resp.raise_for_status()
        rows = resp.json()
        if not rows:
            return None

        # Group rows by course_id
        course_map: dict[str, list[dict]] = {}
        for row in rows:
            cid = row["course_id"]
            course_map.setdefault(cid, []).append(row)

        courses = []
        for cid, section_rows in course_map.items():
            sections = [
                Section(
                    section_id=r["section_id"],
                    course_id=r["course_id"],
                    course_name=r.get("course_name", cid),
                    section_code=r.get("section_code", "001"),
                    professor=r.get("professor", "TBA"),
                    professor_rating=r.get("professor_rating"),
                    days=r.get("days", []),
                    start_time=r.get("start_time", "09:00"),
                    end_time=r.get("end_time", "10:00"),
                    room=r.get("room", "TBA"),
                )
                for r in section_rows
            ]
            courses.append(
                Course(
                    course_id=cid,
                    course_name=section_rows[0].get("course_name", cid),
                    sections=sections,
                )
            )
        return courses
    except Exception as e:
        print(f"Supabase fetch failed, using local data: {e}")
        return None


def _get_all() -> list[Course]:
    """Return courses from Supabase if available, otherwise local seeded data."""
    db_courses = _fetch_supabase_courses()
    if db_courses:
        return db_courses
    return get_all_courses()


def _get_by_ids(ids: list[str]) -> list[Course]:
    """Return matching courses from Supabase if available, otherwise local."""
    db_courses = _fetch_supabase_courses()
    if db_courses:
        return [c for c in db_courses if c.course_id in ids]
    return get_courses_by_ids(ids)

app = FastAPI(title="ScheduleAI Solver")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class BlockedSlot(BaseModel):
    days: list[str]
    start_time: str
    end_time: str


class SolveRequest(BaseModel):
    course_ids: list[str]
    preferences: dict | None = None
    required_ids: list[str] | None = None
    wanted_ids: list[str] | None = None
    blocked_slots: list[BlockedSlot] | None = None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/courses")
def list_courses():
    """Return all available courses and their sections."""
    courses = _get_all()
    return [c.model_dump() for c in courses]


@app.post("/solve")
def solve(req: SolveRequest):
    """Find and rank valid schedules for the selected courses."""
    courses = _get_by_ids(req.course_ids)
    if not courses:
        return {"schedules": [], "error": "No matching courses found"}

    pref_data = req.preferences or {}
    prefs = Preferences(
        time_preference=pref_data.get("time_preference", "none"),
        prefer_best_professors=pref_data.get("prefer_best_professors", 0.5),
        minimize_gaps=pref_data.get("minimize_gaps", 0.3),
        prefer_days_off=pref_data.get("prefer_days_off", []),
        avoid_early=pref_data.get("avoid_early", False),
        avoid_late=pref_data.get("avoid_late", False),
    )

    blocked = [s.model_dump() for s in (req.blocked_slots or [])]

    schedules = solve_schedules(
        courses,
        prefs,
        max_results=5,
        required_ids=req.required_ids,
        wanted_ids=req.wanted_ids,
        blocked_slots=blocked,
    )
    return {"schedules": schedules, "total_found": len(schedules)}
