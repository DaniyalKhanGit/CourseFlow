import { useState, useEffect, useCallback } from 'react';
import Calendar from './components/Calendar';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import PromptBar from './components/PromptBar';
import { fetchCourses, solveSchedules, reoptimize } from './api/client';
import type { Course, Schedule, Preferences } from './types';
import './App.css';

function App() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [activeScheduleIndex, setActiveScheduleIndex] = useState(0);
  const [preferences, setPreferences] = useState<Preferences>({});
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available courses on mount
  useEffect(() => {
    fetchCourses()
      .then(setCourses)
      .catch(() => setError('Failed to load courses. Is the server running?'));
  }, []);

  // Solve whenever selected courses change
  const handleSolve = useCallback(async (courseIds: string[]) => {
    if (courseIds.length === 0) {
      setSchedules([]);
      setExplanation(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await solveSchedules(courseIds, preferences);
      setSchedules(result.schedules);
      setActiveScheduleIndex(0);
      if (result.schedules.length === 0) {
        setExplanation('No valid schedules found. Try removing a course or relaxing constraints.');
      } else {
        setExplanation(result.explanation ?? null);
      }
    } catch {
      setError('Failed to generate schedules. Check that all services are running.');
    } finally {
      setIsLoading(false);
    }
  }, [preferences]);

  const handleToggleCourse = useCallback(
    (courseId: string) => {
      const next = selectedCourseIds.includes(courseId)
        ? selectedCourseIds.filter((id) => id !== courseId)
        : [...selectedCourseIds, courseId];
      setSelectedCourseIds(next);
      handleSolve(next);
    },
    [selectedCourseIds, handleSolve],
  );

  const handlePrompt = useCallback(
    async (prompt: string) => {
      if (selectedCourseIds.length === 0) return;

      setIsLoading(true);
      setError(null);
      const currentSections =
        schedules[activeScheduleIndex]?.sections ?? null;

      try {
        const result = await reoptimize(
          prompt,
          selectedCourseIds,
          preferences,
          currentSections,
        );
        setSchedules(result.schedules);
        setPreferences(result.preferences);
        setExplanation(result.explanation);
        setActiveScheduleIndex(0);
      } catch {
        setError('Failed to process your request. Try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [selectedCourseIds, schedules, activeScheduleIndex, preferences],
  );

  const activeSections = schedules[activeScheduleIndex]?.sections ?? [];

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">ScheduleAI</h1>
        <span className="app-subtitle">AI-Powered Schedule Optimizer</span>
      </header>

      <div className="app-body">
        <LeftSidebar
          courses={courses}
          selectedCourseIds={selectedCourseIds}
          onToggleCourse={handleToggleCourse}
          schedules={schedules}
          activeScheduleIndex={activeScheduleIndex}
          onSelectSchedule={setActiveScheduleIndex}
          isLoading={isLoading}
        />

        <main className="app-main">
          <Calendar sections={activeSections} isLoading={isLoading} />
        </main>

        <RightSidebar
          explanation={explanation}
          preferences={preferences}
          error={error}
        />
      </div>

      <PromptBar
        onSubmit={handlePrompt}
        isLoading={isLoading}
        disabled={selectedCourseIds.length === 0}
      />
    </div>
  );
}

export default App;
