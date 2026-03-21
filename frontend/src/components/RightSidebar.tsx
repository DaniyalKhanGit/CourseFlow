import type { Preferences } from '../types';

interface Props {
  explanation: string | null;
  preferences: Preferences;
  error: string | null;
}

function prefLabel(prefs: Preferences): string[] {
  const chips: string[] = [];
  if (prefs.time_preference && prefs.time_preference !== 'none') {
    chips.push(`${prefs.time_preference.charAt(0).toUpperCase() + prefs.time_preference.slice(1)} preferred`);
  }
  if (prefs.prefer_best_professors && prefs.prefer_best_professors > 0.6) {
    chips.push('Best professors');
  }
  if (prefs.minimize_gaps && prefs.minimize_gaps > 0.5) {
    chips.push('Minimize gaps');
  }
  if (prefs.prefer_days_off && prefs.prefer_days_off.length > 0) {
    chips.push(`${prefs.prefer_days_off.join(', ')} off`);
  }
  if (prefs.avoid_early) chips.push('No early classes');
  if (prefs.avoid_late) chips.push('No late classes');
  return chips;
}

export default function RightSidebar({ explanation, preferences, error }: Props) {
  const chips = prefLabel(preferences);

  return (
    <div className="right-sidebar">
      {/* Active preferences */}
      {chips.length > 0 && (
        <div className="sidebar-section">
          <h3 className="sidebar-heading">Preferences</h3>
          <div className="preference-chips">
            {chips.map((chip) => (
              <span key={chip} className="preference-chip">
                {chip}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Explanation */}
      <div className="sidebar-section">
        <h3 className="sidebar-heading">Explanation</h3>
        {error ? (
          <div className="explanation-error">{error}</div>
        ) : explanation ? (
          <p className="explanation-text">{explanation}</p>
        ) : (
          <p className="explanation-placeholder">
            Select courses and generate a schedule to see AI-powered analysis here.
          </p>
        )}
      </div>
    </div>
  );
}
