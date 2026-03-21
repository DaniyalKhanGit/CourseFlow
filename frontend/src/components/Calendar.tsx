import type { Section, BlockedSlot } from '../types';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const START_HOUR = 8;
const END_HOUR = 18;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

const COURSE_COLORS: Record<string, { bg: string; accent: string }> = {
  COMP250: { bg: '#e8f0fe', accent: '#4285f4' },
  MATH240: { bg: '#e6f4ea', accent: '#34a853' },
  COMP206: { bg: '#fce8e6', accent: '#ea4335' },
  ECSE200: { bg: '#fef7e0', accent: '#f9ab00' },
  COMP273: { bg: '#f3e8fd', accent: '#a142f4' },
  PHIL230: { bg: '#e8f7f0', accent: '#12b5cb' },
  COMP302: { bg: '#fde7f0', accent: '#e91e8a' },
};

const DEFAULT_COLOR = { bg: '#f0f0f0', accent: '#888' };

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function formatHour(hour: number): string {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h} ${ampm}`;
}

interface Props {
  sections: Section[];
  blockedSlots?: BlockedSlot[];
  isLoading?: boolean;
  hasGenerated?: boolean;
  onBlockClick?: (section: Section) => void;
}

export default function Calendar({ sections, blockedSlots = [], isLoading, hasGenerated, onBlockClick }: Props) {
  const totalMinutes = (END_HOUR - START_HOUR) * 60;

  return (
    <div className="calendar">
      <div className="calendar-header">
        <div className="calendar-time-gutter" />
        {DAYS.map((day) => (
          <div key={day} className="calendar-day-header">{day}</div>
        ))}
      </div>

      <div className={`calendar-body ${isLoading ? 'calendar-loading' : ''}`}>
        <div className="calendar-time-gutter">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="calendar-time-label"
              style={{ top: `${((hour - START_HOUR) / (END_HOUR - START_HOUR)) * 100}%` }}
            >
              {formatHour(hour)}
            </div>
          ))}
        </div>

        {DAYS.map((day) => (
          <div key={day} className="calendar-day-column">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="calendar-hour-line"
                style={{ top: `${((hour - START_HOUR) / (END_HOUR - START_HOUR)) * 100}%` }}
              />
            ))}

            {/* Blocked slot overlays */}
            {blockedSlots
              .filter((slot) => slot.days.includes(day))
              .map((slot, idx) => {
                const start = timeToMinutes(slot.start_time) - START_HOUR * 60;
                const end = timeToMinutes(slot.end_time) - START_HOUR * 60;
                const top = (start / totalMinutes) * 100;
                const height = ((end - start) / totalMinutes) * 100;
                return (
                  <div
                    key={`blocked-${idx}`}
                    className="calendar-blocked"
                    style={{ top: `${top}%`, height: `${height}%` }}
                  >
                    <span className="calendar-blocked-label">Blocked</span>
                  </div>
                );
              })}

            {/* Section blocks */}
            {sections
              .filter((s) => s.days.includes(day))
              .map((section) => {
                const start = timeToMinutes(section.start_time) - START_HOUR * 60;
                const end = timeToMinutes(section.end_time) - START_HOUR * 60;
                const top = (start / totalMinutes) * 100;
                const height = ((end - start) / totalMinutes) * 100;
                const colors = COURSE_COLORS[section.course_id] || DEFAULT_COLOR;

                return (
                  <div
                    key={`${section.section_id}-${day}`}
                    className="calendar-block"
                    style={{
                      top: `${top}%`,
                      height: `${height}%`,
                      backgroundColor: colors.bg,
                      borderLeft: `4px solid ${colors.accent}`,
                      cursor: onBlockClick ? 'pointer' : 'default',
                    }}
                    onClick={() => onBlockClick?.(section)}
                  >
                    <span className="calendar-block-course">{section.course_id}</span>
                    <span className="calendar-block-detail">
                      {section.start_time}–{section.end_time}
                    </span>
                    <span className="calendar-block-detail">{section.professor}</span>
                    {section.professor_rating !== null && (
                      <span className="calendar-block-rating">
                        {'★'} {section.professor_rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
        ))}

        {/* Empty state */}
        {sections.length === 0 && !isLoading && (
          <div className="calendar-empty">
            {hasGenerated
              ? 'No valid schedules found. Try adjusting courses or constraints.'
              : 'Select courses and click Generate Schedule'}
          </div>
        )}
      </div>
    </div>
  );
}
