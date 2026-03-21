import type { Course, Schedule } from '../types';

interface Props {
  courses: Course[];
  selectedCourseIds: string[];
  onToggleCourse: (courseId: string) => void;
  schedules: Schedule[];
  activeScheduleIndex: number;
  onSelectSchedule: (index: number) => void;
  isLoading: boolean;
}

function formatScore(score: number): string {
  return score.toFixed(0);
}

function getAvgRating(sections: Schedule['sections']): string {
  const rated = sections.filter((s) => s.professor_rating !== null);
  if (rated.length === 0) return 'N/A';
  const avg = rated.reduce((sum, s) => sum + (s.professor_rating ?? 0), 0) / rated.length;
  return avg.toFixed(1);
}

function getTimeRange(sections: Schedule['sections']): string {
  let earliest = '23:59';
  let latest = '00:00';
  for (const s of sections) {
    if (s.start_time < earliest) earliest = s.start_time;
    if (s.end_time > latest) latest = s.end_time;
  }
  return `${earliest}–${latest}`;
}

export default function LeftSidebar({
  courses,
  selectedCourseIds,
  onToggleCourse,
  schedules,
  activeScheduleIndex,
  onSelectSchedule,
  isLoading,
}: Props) {
  return (
    <div className="left-sidebar">
      {/* Course selection */}
      <div className="sidebar-section">
        <h3 className="sidebar-heading">Courses</h3>
        <div className="course-list">
          {courses.map((course) => (
            <label key={course.course_id} className="course-item">
              <input
                type="checkbox"
                checked={selectedCourseIds.includes(course.course_id)}
                onChange={() => onToggleCourse(course.course_id)}
              />
              <div className="course-item-info">
                <span className="course-item-id">{course.course_id}</span>
                <span className="course-item-name">{course.course_name}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Schedule selector */}
      {schedules.length > 0 && (
        <div className="sidebar-section">
          <h3 className="sidebar-heading">Schedules</h3>
          <div className="schedule-list">
            {schedules.map((schedule, i) => (
              <button
                key={i}
                className={`schedule-card ${i === activeScheduleIndex ? 'schedule-card-active' : ''}`}
                onClick={() => onSelectSchedule(i)}
              >
                <div className="schedule-card-header">
                  <span className="schedule-card-rank">
                    #{i + 1}{i === 0 ? ' Best' : ''}
                  </span>
                  <span className="schedule-card-score">
                    Score: {formatScore(schedule.score)}
                  </span>
                </div>
                <div className="schedule-card-stats">
                  <span>{'★'} {getAvgRating(schedule.sections)} avg</span>
                  <span>{getTimeRange(schedule.sections)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="sidebar-loading">Generating schedules...</div>
      )}
    </div>
  );
}
