import { useState } from 'react';
import type { Course, CourseSelection, BlockedSlot, Schedule } from '../types';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const TIME_OPTIONS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
];

interface Props {
  courses: Course[];
  selections: CourseSelection[];
  onUpdateSelections: (selections: CourseSelection[]) => void;
  blockedSlots: BlockedSlot[];
  onUpdateBlockedSlots: (slots: BlockedSlot[]) => void;
  onGenerate: () => void;
  hasGenerated: boolean;
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

function formatTime(t: string): string {
  const h = parseInt(t.split(':')[0]);
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 || 12;
  return `${h12} ${ampm}`;
}

export default function LeftSidebar({
  courses,
  selections,
  onUpdateSelections,
  blockedSlots,
  onUpdateBlockedSlots,
  onGenerate,
  hasGenerated,
  schedules,
  activeScheduleIndex,
  onSelectSchedule,
  isLoading,
}: Props) {
  const [showBlockedForm, setShowBlockedForm] = useState(false);
  const [blockDays, setBlockDays] = useState<string[]>([]);
  const [blockStart, setBlockStart] = useState('08:00');
  const [blockEnd, setBlockEnd] = useState('09:00');

  const selectedMap = new Map(selections.map((s) => [s.course_id, s.priority]));

  const toggleCourse = (courseId: string) => {
    if (selectedMap.has(courseId)) {
      onUpdateSelections(selections.filter((s) => s.course_id !== courseId));
    } else {
      onUpdateSelections([...selections, { course_id: courseId, priority: 'required' }]);
    }
  };

  const togglePriority = (courseId: string) => {
    onUpdateSelections(
      selections.map((s) =>
        s.course_id === courseId
          ? { ...s, priority: s.priority === 'required' ? 'wanted' : 'required' }
          : s,
      ),
    );
  };

  const addBlockedSlot = () => {
    if (blockDays.length === 0 || blockStart >= blockEnd) return;
    onUpdateBlockedSlots([
      ...blockedSlots,
      { days: blockDays, start_time: blockStart, end_time: blockEnd },
    ]);
    setBlockDays([]);
    setBlockStart('08:00');
    setBlockEnd('09:00');
    setShowBlockedForm(false);
  };

  const removeBlockedSlot = (index: number) => {
    onUpdateBlockedSlots(blockedSlots.filter((_, i) => i !== index));
  };

  return (
    <div className="left-sidebar">
      {/* Course selection */}
      <div className="sidebar-section">
        <h3 className="sidebar-heading">Courses</h3>
        <div className="course-list">
          {courses.map((course) => {
            const isSelected = selectedMap.has(course.course_id);
            const priority = selectedMap.get(course.course_id);
            return (
              <div key={course.course_id} className="course-item">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleCourse(course.course_id)}
                />
                <div className="course-item-info" onClick={() => toggleCourse(course.course_id)}>
                  <span className="course-item-id">{course.course_id}</span>
                  <span className="course-item-name">{course.course_name}</span>
                </div>
                {isSelected && (
                  <button
                    className={`priority-toggle ${priority === 'required' ? 'priority-required' : 'priority-wanted'}`}
                    onClick={() => togglePriority(course.course_id)}
                    title={priority === 'required' ? 'Click to mark as Wanted' : 'Click to mark as Required'}
                  >
                    {priority === 'required' ? 'Req' : 'Want'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Blocked time slots */}
      <div className="sidebar-section">
        <h3 className="sidebar-heading">Blocked Times</h3>
        {blockedSlots.length > 0 && (
          <div className="blocked-list">
            {blockedSlots.map((slot, i) => (
              <div key={i} className="blocked-chip">
                <span>{slot.days.join(', ')} {formatTime(slot.start_time)}–{formatTime(slot.end_time)}</span>
                <button className="blocked-remove" onClick={() => removeBlockedSlot(i)}>×</button>
              </div>
            ))}
          </div>
        )}
        {showBlockedForm ? (
          <div className="blocked-form">
            <div className="blocked-form-days">
              {DAYS.map((day) => (
                <label key={day} className="blocked-day-label">
                  <input
                    type="checkbox"
                    checked={blockDays.includes(day)}
                    onChange={() =>
                      setBlockDays((prev) =>
                        prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
                      )
                    }
                  />
                  <span>{day}</span>
                </label>
              ))}
            </div>
            <div className="blocked-form-times">
              <select value={blockStart} onChange={(e) => setBlockStart(e.target.value)}>
                {TIME_OPTIONS.slice(0, -1).map((t) => (
                  <option key={t} value={t}>{formatTime(t)}</option>
                ))}
              </select>
              <span>to</span>
              <select value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)}>
                {TIME_OPTIONS.slice(1).map((t) => (
                  <option key={t} value={t}>{formatTime(t)}</option>
                ))}
              </select>
            </div>
            <div className="blocked-form-actions">
              <button className="btn-small btn-primary" onClick={addBlockedSlot} disabled={blockDays.length === 0 || blockStart >= blockEnd}>
                Add
              </button>
              <button className="btn-small btn-ghost" onClick={() => setShowBlockedForm(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button className="btn-small btn-ghost" onClick={() => setShowBlockedForm(true)}>
            + Block a time slot
          </button>
        )}
      </div>

      {/* Generate button */}
      <div className="sidebar-section">
        <button
          className="generate-btn"
          onClick={onGenerate}
          disabled={selections.length === 0 || isLoading}
        >
          {isLoading ? 'Generating...' : hasGenerated ? 'Regenerate Schedule' : 'Generate Schedule'}
        </button>
      </div>

      {/* Schedule selector — only after generation */}
      {hasGenerated && schedules.length > 0 && (
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
    </div>
  );
}
