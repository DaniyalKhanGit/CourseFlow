import type { Section } from '../types';

interface Props {
  section: Section;
  onClose: () => void;
}

export default function BlockDetail({ section, onClose }: Props) {
  return (
    <div className="block-detail-overlay" onClick={onClose}>
      <div className="block-detail" onClick={(e) => e.stopPropagation()}>
        <div className="block-detail-header">
          <div>
            <h3 className="block-detail-course">{section.course_id}</h3>
            <p className="block-detail-name">{section.course_name}</p>
          </div>
          <button className="block-detail-close" onClick={onClose}>×</button>
        </div>

        <div className="block-detail-body">
          <div className="block-detail-row">
            <span className="block-detail-label">Section</span>
            <span>{section.section_code}</span>
          </div>
          <div className="block-detail-row">
            <span className="block-detail-label">Days</span>
            <span>{section.days.join(', ')}</span>
          </div>
          <div className="block-detail-row">
            <span className="block-detail-label">Time</span>
            <span>{section.start_time} – {section.end_time}</span>
          </div>
          <div className="block-detail-row">
            <span className="block-detail-label">Room</span>
            <span>{section.room}</span>
          </div>
          <div className="block-detail-row">
            <span className="block-detail-label">Professor</span>
            <span>{section.professor}</span>
          </div>
          <div className="block-detail-row">
            <span className="block-detail-label">Rating</span>
            <span>
              {section.professor_rating !== null
                ? `${'★'} ${section.professor_rating.toFixed(1)} / 5.0`
                : 'No rating'}
            </span>
          </div>
          <div className="block-detail-row">
            <span className="block-detail-label">Priority</span>
            <span className={`priority-badge ${section.priority === 'required' ? 'priority-badge-required' : 'priority-badge-wanted'}`}>
              {section.priority === 'required' ? 'Required' : 'Wanted'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
