"""
Seeded sample course data for demo purposes.
Modeled after a typical CS undergrad semester at a Canadian university.
"""

from pydantic import BaseModel


class Section(BaseModel):
    section_id: str
    course_id: str
    course_name: str
    section_code: str  # e.g. "001", "002"
    professor: str
    professor_rating: float | None  # 1.0-5.0, None if unknown
    days: list[str]  # ["Mon", "Wed", "Fri"] or ["Tue", "Thu"]
    start_time: str  # "09:00" 24h format
    end_time: str  # "10:00"
    room: str


class Course(BaseModel):
    course_id: str
    course_name: str
    sections: list[Section]


COURSES: list[Course] = [
    Course(
        course_id="COMP250",
        course_name="Intro to Computer Science",
        sections=[
            Section(
                section_id="COMP250-001",
                course_id="COMP250",
                course_name="Intro to Computer Science",
                section_code="001",
                professor="Dr. Smith",
                professor_rating=4.5,
                days=["Mon", "Wed", "Fri"],
                start_time="09:00",
                end_time="10:00",
                room="BURN 1B24",
            ),
            Section(
                section_id="COMP250-002",
                course_id="COMP250",
                course_name="Intro to Computer Science",
                section_code="002",
                professor="Dr. Patel",
                professor_rating=3.8,
                days=["Mon", "Wed", "Fri"],
                start_time="13:00",
                end_time="14:00",
                room="MAAS 112",
            ),
            Section(
                section_id="COMP250-003",
                course_id="COMP250",
                course_name="Intro to Computer Science",
                section_code="003",
                professor="Dr. Chen",
                professor_rating=4.2,
                days=["Tue", "Thu"],
                start_time="10:00",
                end_time="11:30",
                room="ENGM 204",
            ),
        ],
    ),
    Course(
        course_id="MATH240",
        course_name="Discrete Structures",
        sections=[
            Section(
                section_id="MATH240-001",
                course_id="MATH240",
                course_name="Discrete Structures",
                section_code="001",
                professor="Dr. Kaplan",
                professor_rating=4.0,
                days=["Mon", "Wed", "Fri"],
                start_time="10:00",
                end_time="11:00",
                room="BURN 1B36",
            ),
            Section(
                section_id="MATH240-002",
                course_id="MATH240",
                course_name="Discrete Structures",
                section_code="002",
                professor="Dr. Liu",
                professor_rating=3.5,
                days=["Tue", "Thu"],
                start_time="13:00",
                end_time="14:30",
                room="BURN 1B24",
            ),
        ],
    ),
    Course(
        course_id="COMP206",
        course_name="Software Systems",
        sections=[
            Section(
                section_id="COMP206-001",
                course_id="COMP206",
                course_name="Software Systems",
                section_code="001",
                professor="Dr. Vybihal",
                professor_rating=3.9,
                days=["Tue", "Thu"],
                start_time="08:30",
                end_time="10:00",
                room="MAAS 10",
            ),
            Section(
                section_id="COMP206-002",
                course_id="COMP206",
                course_name="Software Systems",
                section_code="002",
                professor="Dr. Kry",
                professor_rating=4.3,
                days=["Mon", "Wed", "Fri"],
                start_time="14:00",
                end_time="15:00",
                room="ENGM 204",
            ),
            Section(
                section_id="COMP206-003",
                course_id="COMP206",
                course_name="Software Systems",
                section_code="003",
                professor="Dr. Vybihal",
                professor_rating=3.9,
                days=["Tue", "Thu"],
                start_time="14:30",
                end_time="16:00",
                room="MAAS 112",
            ),
        ],
    ),
    Course(
        course_id="ECSE200",
        course_name="Electric Circuits 1",
        sections=[
            Section(
                section_id="ECSE200-001",
                course_id="ECSE200",
                course_name="Electric Circuits 1",
                section_code="001",
                professor="Dr. Bhatt",
                professor_rating=4.1,
                days=["Mon", "Wed", "Fri"],
                start_time="11:00",
                end_time="12:00",
                room="MAAS 10",
            ),
            Section(
                section_id="ECSE200-002",
                course_id="ECSE200",
                course_name="Electric Circuits 1",
                section_code="002",
                professor="Dr. Bhatt",
                professor_rating=4.1,
                days=["Tue", "Thu"],
                start_time="11:30",
                end_time="13:00",
                room="ENGM 204",
            ),
        ],
    ),
    Course(
        course_id="COMP273",
        course_name="Computer Architecture",
        sections=[
            Section(
                section_id="COMP273-001",
                course_id="COMP273",
                course_name="Computer Architecture",
                section_code="001",
                professor="Dr. Bhatt",
                professor_rating=4.1,
                days=["Tue", "Thu"],
                start_time="16:00",
                end_time="17:30",
                room="BURN 1B24",
            ),
            Section(
                section_id="COMP273-002",
                course_id="COMP273",
                course_name="Computer Architecture",
                section_code="002",
                professor="Dr. Alberini",
                professor_rating=None,
                days=["Mon", "Wed", "Fri"],
                start_time="15:00",
                end_time="16:00",
                room="MAAS 112",
            ),
        ],
    ),
    Course(
        course_id="PHIL230",
        course_name="Ethics of AI",
        sections=[
            Section(
                section_id="PHIL230-001",
                course_id="PHIL230",
                course_name="Ethics of AI",
                section_code="001",
                professor="Dr. Green",
                professor_rating=4.7,
                days=["Mon", "Wed"],
                start_time="16:00",
                end_time="17:30",
                room="ARTS W-20",
            ),
            Section(
                section_id="PHIL230-002",
                course_id="PHIL230",
                course_name="Ethics of AI",
                section_code="002",
                professor="Dr. Martin",
                professor_rating=3.2,
                days=["Tue", "Thu"],
                start_time="10:00",
                end_time="11:30",
                room="ARTS W-20",
            ),
        ],
    ),
    Course(
        course_id="COMP302",
        course_name="Programming Languages",
        sections=[
            Section(
                section_id="COMP302-001",
                course_id="COMP302",
                course_name="Programming Languages",
                section_code="001",
                professor="Dr. Bhatt",
                professor_rating=4.1,
                days=["Mon", "Wed", "Fri"],
                start_time="08:00",
                end_time="09:00",
                room="BURN 1B24",
            ),
            Section(
                section_id="COMP302-002",
                course_id="COMP302",
                course_name="Programming Languages",
                section_code="002",
                professor="Dr. Prakash",
                professor_rating=4.6,
                days=["Tue", "Thu"],
                start_time="13:00",
                end_time="14:30",
                room="MAAS 10",
            ),
        ],
    ),
]


def get_courses_by_ids(course_ids: list[str]) -> list[Course]:
    """Return courses matching the given IDs."""
    return [c for c in COURSES if c.course_id in course_ids]


def get_all_courses() -> list[Course]:
    """Return all available courses."""
    return COURSES
