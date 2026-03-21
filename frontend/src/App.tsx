import { useState, useEffect, useCallback } from 'react';
import Calendar from './components/Calendar';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import PromptBar from './components/PromptBar';
import BlockDetail from './components/BlockDetail';
import { fetchCourses, solveSchedules, reoptimize } from './api/client';
import type { Course, CourseSelection, BlockedSlot, Schedule, Preferences, Section } from './types';
import './App.css';

function App() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selections, setSelections] = useState<CourseSelection[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [activeScheduleIndex, setActiveScheduleIndex] = useState(0);
  const [preferences, setPreferences] = useState<Preferences>({});
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<Section | null>(null);

  useEffect(() => {
    fetchCourses()
      .then(setCourses)
      .catch(() => setError('Failed to load courses. Is the server running?'));
  }, []);

  const handleGenerate = useCallback(async () => {
    if (selections.length === 0) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await solveSchedules(selections, preferences, blockedSlots);
      setSchedules(result.schedules);
      setActiveScheduleIndex(0);
      setHasGenerated(true);
      if (result.schedules.length === 0) {
        setExplanation('No valid schedules found. Try removing a course, changing priorities, or adjusting blocked times.');
      } else {
        setExplanation(result.explanation ?? null);
      }
    } catch {
      setError('Failed to generate schedules. Check that all services are running.');
    } finally {
      setIsLoading(false);
    }
  }, [selections, preferences, blockedSlots]);

  const handlePrompt = useCallback(
    async (prompt: string) => {
      if (selections.length === 0) return;

      setIsLoading(true);
      setError(null);
      const currentSections = schedules[activeScheduleIndex]?.sections ?? null;

      try {
        const result = await reoptimize(
          prompt,
          selections,
          preferences,
          currentSections,
          blockedSlots,
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
    [selections, schedules, activeScheduleIndex, preferences, blockedSlots],
  );

  const activeSections = schedules[activeScheduleIndex]?.sections ?? [];

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">CourseFlow</h1>
        <span className="app-subtitle">Schedule Advisor</span>
      </header>

      <div className="app-body">
        <LeftSidebar
          courses={courses}
          selections={selections}
          onUpdateSelections={setSelections}
          blockedSlots={blockedSlots}
          onUpdateBlockedSlots={setBlockedSlots}
          onGenerate={handleGenerate}
          hasGenerated={hasGenerated}
          schedules={schedules}
          activeScheduleIndex={activeScheduleIndex}
          onSelectSchedule={setActiveScheduleIndex}
          isLoading={isLoading}
        />

        <main className="app-main">
          <Calendar
            sections={hasGenerated ? activeSections : []}
            blockedSlots={blockedSlots}
            isLoading={isLoading}
            hasGenerated={hasGenerated}
            onBlockClick={hasGenerated ? setSelectedBlock : undefined}
          />
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
        disabled={!hasGenerated || selections.length === 0}
      />

      {selectedBlock && (
        <BlockDetail section={selectedBlock} onClose={() => setSelectedBlock(null)} />
      )}
    </div>
  );
}

export default App;
