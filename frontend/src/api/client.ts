import type { Course, SolveResponse, ReoptimizeResponse, Preferences, Section } from '../types';

const BASE = '/api';

export async function fetchCourses(): Promise<Course[]> {
  const res = await fetch(`${BASE}/courses`);
  if (!res.ok) throw new Error('Failed to fetch courses');
  return res.json();
}

export async function solveSchedules(
  courseIds: string[],
  preferences?: Preferences,
): Promise<SolveResponse> {
  const res = await fetch(`${BASE}/solve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ course_ids: courseIds, preferences }),
  });
  if (!res.ok) throw new Error('Failed to solve schedules');
  return res.json();
}

export async function reoptimize(
  prompt: string,
  courseIds: string[],
  currentPreferences: Preferences,
  currentSchedule: Section[] | null,
): Promise<ReoptimizeResponse> {
  const res = await fetch(`${BASE}/reoptimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      course_ids: courseIds,
      current_preferences: currentPreferences,
      current_schedule: currentSchedule,
    }),
  });
  if (!res.ok) throw new Error('Failed to reoptimize');
  return res.json();
}
