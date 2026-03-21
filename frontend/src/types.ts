export interface Section {
  section_id: string;
  course_id: string;
  course_name: string;
  section_code: string;
  professor: string;
  professor_rating: number | null;
  days: string[];
  start_time: string;
  end_time: string;
  room: string;
  priority?: 'required' | 'wanted';
}

export interface Course {
  course_id: string;
  course_name: string;
  sections: Section[];
}

export interface CourseSelection {
  course_id: string;
  priority: 'required' | 'wanted';
}

export interface BlockedSlot {
  days: string[];
  start_time: string;
  end_time: string;
}

export interface Schedule {
  sections: Section[];
  score: number;
}

export interface Preferences {
  time_preference?: string;
  prefer_best_professors?: number;
  minimize_gaps?: number;
  prefer_days_off?: string[];
  avoid_early?: boolean;
  avoid_late?: boolean;
}

export interface SolveResponse {
  schedules: Schedule[];
  total_found: number;
  explanation: string | null;
}

export interface ReoptimizeResponse {
  schedules: Schedule[];
  preferences: Preferences;
  explanation: string;
}
