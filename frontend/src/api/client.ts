import type { Course, SolveResponse, ReoptimizeResponse, Preferences, Section, CourseSelection, BlockedSlot } from '../types';

const BASE = '/api';

export async function fetchCourses(): Promise<Course[]> {
  const res = await fetch(`${BASE}/courses`);
  if (!res.ok) throw new Error('Failed to fetch courses');
  return res.json();
}

export async function solveSchedules(
  selections: CourseSelection[],
  preferences?: Preferences,
  blockedSlots?: BlockedSlot[],
): Promise<SolveResponse> {
  const courseIds = selections.map((s) => s.course_id);
  const requiredIds = selections.filter((s) => s.priority === 'required').map((s) => s.course_id);
  const wantedIds = selections.filter((s) => s.priority === 'wanted').map((s) => s.course_id);

  const res = await fetch(`${BASE}/solve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      course_ids: courseIds,
      preferences,
      required_ids: requiredIds,
      wanted_ids: wantedIds,
      blocked_slots: blockedSlots,
    }),
  });
  if (!res.ok) throw new Error('Failed to solve schedules');
  return res.json();
}

export async function reoptimize(
  prompt: string,
  selections: CourseSelection[],
  currentPreferences: Preferences,
  currentSchedule: Section[] | null,
  blockedSlots?: BlockedSlot[],
): Promise<ReoptimizeResponse> {
  const courseIds = selections.map((s) => s.course_id);
  const requiredIds = selections.filter((s) => s.priority === 'required').map((s) => s.course_id);
  const wantedIds = selections.filter((s) => s.priority === 'wanted').map((s) => s.course_id);

  const res = await fetch(`${BASE}/reoptimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      course_ids: courseIds,
      required_ids: requiredIds,
      wanted_ids: wantedIds,
      blocked_slots: blockedSlots,
      current_preferences: currentPreferences,
      current_schedule: currentSchedule,
    }),
  });
  if (!res.ok) throw new Error('Failed to reoptimize');
  return res.json();
}
