import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY || '';
const hasApiKey = apiKey.length > 0 && apiKey !== 'sk-your-key-here';

const openai = new OpenAI({ apiKey });

/**
 * Known preference fields the solver accepts.
 * Used to validate LLM output before passing to the solver.
 */
const VALID_PREFERENCE_KEYS = new Set([
  'time_preference',
  'prefer_best_professors',
  'minimize_gaps',
  'prefer_days_off',
  'avoid_early',
  'avoid_late',
]);

const VALID_TIME_PREFERENCES = new Set(['morning', 'afternoon', 'evening', 'none']);

export interface ParsedPreferences {
  time_preference?: string;
  prefer_best_professors?: number;
  minimize_gaps?: number;
  prefer_days_off?: string[];
  avoid_early?: boolean;
  avoid_late?: boolean;
}

/**
 * Parse a natural language preference prompt into structured solver constraints.
 * Validates the LLM output before returning.
 */
export async function parsePreferences(
  prompt: string,
  currentPreferences: ParsedPreferences = {},
): Promise<ParsedPreferences> {
  if (!hasApiKey) {
    return fallbackParsePreferences(prompt, currentPreferences);
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are a schedule preference parser. Given a student's natural language request about their class schedule, output a JSON object with ONLY these fields (include only fields that need to change):

- time_preference: "morning" | "afternoon" | "evening" | "none"
- prefer_best_professors: number 0.0-1.0 (weight for professor ratings)
- minimize_gaps: number 0.0-1.0 (weight for minimizing gaps between classes)
- prefer_days_off: string[] (days to keep free, e.g. ["Fri"])
- avoid_early: boolean (avoid classes before 10am)
- avoid_late: boolean (avoid classes after 4pm)

Current preferences: ${JSON.stringify(currentPreferences)}

Return ONLY valid JSON. Only include fields the user wants to change.`,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from OpenAI');
  }

  const parsed = JSON.parse(content);

  // Validate: strip unknown keys, type-check known ones
  const validated: ParsedPreferences = { ...currentPreferences };

  for (const [key, value] of Object.entries(parsed)) {
    if (!VALID_PREFERENCE_KEYS.has(key)) continue;

    switch (key) {
      case 'time_preference':
        if (typeof value === 'string' && VALID_TIME_PREFERENCES.has(value)) {
          validated.time_preference = value;
        }
        break;
      case 'prefer_best_professors':
      case 'minimize_gaps':
        if (typeof value === 'number' && value >= 0 && value <= 1) {
          validated[key] = value;
        }
        break;
      case 'prefer_days_off':
        if (
          Array.isArray(value) &&
          value.every(
            (d) =>
              typeof d === 'string' &&
              ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(d),
          )
        ) {
          validated.prefer_days_off = value;
        }
        break;
      case 'avoid_early':
      case 'avoid_late':
        if (typeof value === 'boolean') {
          validated[key] = value;
        }
        break;
    }
  }

  return validated;
}

interface ScheduleSection {
  section_id: string;
  course_name: string;
  professor: string;
  professor_rating: number | null;
  days: string[];
  start_time: string;
  end_time: string;
}

/**
 * Generate a human-readable explanation of a schedule or comparison between schedules.
 */
export async function generateExplanation(
  newSchedule: ScheduleSection[],
  oldSchedule: ScheduleSection[] | null,
  preferences: ParsedPreferences,
  userPrompt: string | null,
): Promise<string> {
  if (!hasApiKey) {
    return fallbackExplanation(newSchedule, oldSchedule, preferences, userPrompt);
  }

  const newSummary = newSchedule
    .map(
      (s) =>
        `${s.course_name} (${s.section_id}): ${s.days.join('/')} ${s.start_time}-${s.end_time}, ${s.professor} (${s.professor_rating ?? 'no rating'})`,
    )
    .join('\n');

  let prompt: string;

  if (oldSchedule && userPrompt) {
    const oldSummary = oldSchedule
      .map(
        (s) =>
          `${s.course_name} (${s.section_id}): ${s.days.join('/')} ${s.start_time}-${s.end_time}, ${s.professor} (${s.professor_rating ?? 'no rating'})`,
      )
      .join('\n');

    prompt = `The student asked: "${userPrompt}"

Previous schedule:
${oldSummary}

New schedule:
${newSummary}

Active preferences: ${JSON.stringify(preferences)}

Explain what changed and any real tradeoffs (e.g., different professor, rating change, earlier/later times). Be specific about the actual sections that moved. 2-3 sentences max.`;
  } else {
    prompt = `New schedule generated:
${newSummary}

Active preferences: ${JSON.stringify(preferences)}

Briefly describe this schedule's highlights and any tradeoffs. Mention specific professors and times. 2-3 sentences max.`;
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    max_tokens: 200,
    messages: [
      {
        role: 'system',
        content:
          'You are a concise academic schedule advisor. Explain schedule choices in plain language, mentioning real tradeoffs (professor ratings, time slots, gaps). Never use filler or generic advice. Be specific.',
      },
      { role: 'user', content: prompt },
    ],
  });

  return response.choices[0]?.message?.content || 'Schedule updated.';
}

/**
 * Keyword-based fallback when no OpenAI key is configured.
 * Handles common preference patterns without an LLM.
 */
function fallbackParsePreferences(
  prompt: string,
  current: ParsedPreferences,
): ParsedPreferences {
  const p = prompt.toLowerCase();
  const updated = { ...current };

  if (p.includes('morning')) updated.time_preference = 'morning';
  else if (p.includes('afternoon')) updated.time_preference = 'afternoon';
  else if (p.includes('evening')) updated.time_preference = 'evening';

  if (p.includes('best prof') || p.includes('better prof') || p.includes('good prof') || p.includes('prefer prof')) {
    updated.prefer_best_professors = 1.0;
  }

  if (p.includes('no gap') || p.includes('minimize gap') || p.includes('compact') || p.includes('back to back')) {
    updated.minimize_gaps = 1.0;
  }

  if (p.includes('no early') || p.includes('avoid early') || p.includes('sleep in') || p.includes('no 8am')) {
    updated.avoid_early = true;
  }

  if (p.includes('no late') || p.includes('avoid late') || p.includes('end early') || p.includes('finish early')) {
    updated.avoid_late = true;
  }

  for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const) {
    const full = { Mon: 'monday', Tue: 'tuesday', Wed: 'wednesday', Thu: 'thursday', Fri: 'friday' }[day];
    if (p.includes(`${full} off`) || p.includes(`${full}s off`) || p.includes(`no ${full}`)) {
      updated.prefer_days_off = [...(updated.prefer_days_off || []), day];
    }
  }

  return updated;
}

/**
 * Generate a basic explanation without OpenAI.
 */
function fallbackExplanation(
  newSchedule: ScheduleSection[],
  oldSchedule: ScheduleSection[] | null,
  _preferences: ParsedPreferences,
  userPrompt: string | null,
): string {
  const rated = newSchedule.filter((s) => s.professor_rating !== null);
  const avgRating = rated.length > 0
    ? (rated.reduce((sum, s) => sum + (s.professor_rating ?? 0), 0) / rated.length).toFixed(1)
    : 'N/A';

  const times = newSchedule.map((s) => s.start_time).sort();
  const earliest = times[0] || '?';
  const latest = newSchedule.map((s) => s.end_time).sort().reverse()[0] || '?';

  let text = `This schedule runs ${earliest}–${latest} with an average professor rating of ${avgRating}/5.`;

  if (oldSchedule && userPrompt) {
    const changed = newSchedule.filter(
      (s) => !oldSchedule.some((o) => o.section_id === s.section_id),
    );
    if (changed.length > 0) {
      const names = changed.map((s) => `${s.course_name} (now ${s.days.join('/')} ${s.start_time})`).join(', ');
      text += ` Changed: ${names}.`;
    } else {
      text += ' No sections changed — the current schedule already fits your preferences.';
    }
  }

  return text;
}
