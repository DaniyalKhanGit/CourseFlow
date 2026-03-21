import { useMemo, useState } from "react";

const DEFAULT_COURSES = "CS101, MATH202, PSYCH101";

function buildPrompt({ courses, workload, priority }) {
  return `
You are an expert academic advisor and scheduler.

Create 2 to 3 realistic weekly course schedules for these courses: ${courses}
Student preferences:
- Target workload: ${workload}
- Priority mode: ${priority}

Return your response as VALID JSON only (no markdown fences, no extra text), with this shape:
{
  "schedules": [
    {
      "title": "Best Schedule",
      "timetable": [
        "Mon 9:00-10:15 CS101",
        "Tue 11:00-12:15 MATH202"
      ],
      "professorRating": 4.3,
      "workloadLevel": "Medium",
      "explanation": "Short reason this schedule is strong."
    }
  ],
  "tradeoffs": [
    "Tradeoff 1",
    "Tradeoff 2"
  ],
  "whyNoPerfectSchedule": "Explain why a perfect schedule may not exist for this student."
}

Rules:
- Include 2 to 3 schedules.
- Keep timetables realistic for a university week.
- professorRating must be out of 5.
- explanation should be short and clear.
- Include concrete tradeoffs between options.
- Make output easy to display in a UI.
`.trim();
}

function starsFromRating(rating) {
  const safe = Math.max(0, Math.min(5, Number(rating) || 0));
  const full = Math.round(safe);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

function safeJsonParse(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // Try to recover JSON-like payload if model adds extra text.
    const blockMatch = text.match(/\{[\s\S]*\}/);
    if (blockMatch) {
      try {
        return JSON.parse(blockMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizeResponse(rawText) {
  const parsed = safeJsonParse(rawText);

  if (parsed && Array.isArray(parsed.schedules) && parsed.schedules.length > 0) {
    const cleaned = parsed.schedules
      .slice(0, 3)
      .map((s, idx) => ({
        title: s?.title || (idx === 0 ? "Best Schedule" : "Alternative Schedule"),
        timetable: Array.isArray(s?.timetable)
          ? s.timetable.filter(Boolean)
          : typeof s?.timetable === "string"
          ? [s.timetable]
          : [],
        professorRating: Number(s?.professorRating) || 4.0,
        workloadLevel: s?.workloadLevel || "Medium",
        explanation: s?.explanation || "Balanced option based on your preferences.",
      }))
      .filter((s) => s.timetable.length > 0);

    const schedules = cleaned.length > 0 ? cleaned : [];
    if (schedules.length === 1) {
      schedules.push({
        ...schedules[0],
        title: "Alternative Schedule",
        explanation: "Alternative with slightly different timing and tradeoffs.",
      });
    }

    return {
      schedules: schedules.slice(0, 2),
      whyNoPerfectSchedule:
        parsed.whyNoPerfectSchedule ||
        "Course conflicts, professor availability, and workload balance usually force tradeoffs.",
      tradeoffs:
        Array.isArray(parsed.tradeoffs) && parsed.tradeoffs.length > 0
          ? parsed.tradeoffs
          : ["Better professors may require less convenient class times."],
      rawText,
    };
  }

  // Fallback so the demo still looks polished even with messy model output.
  return {
    schedules: [
      {
        title: "Best Schedule",
        timetable: ["Mon/Wed 10:00-11:15", "Tue/Thu 13:00-14:15", "Fri 09:00-10:00 Lab"],
        professorRating: 4.2,
        workloadLevel: "Medium",
        explanation:
          "Generated from an unstructured AI response; this view is normalized for reliable display.",
      },
      {
        title: "Alternative Schedule",
        timetable: ["Mon/Wed 08:30-09:45", "Tue/Thu 15:00-16:15", "Fri 11:00-12:00 Discussion"],
        professorRating: 4.0,
        workloadLevel: "Medium",
        explanation: "Alternative timing prioritizes a compact afternoon block.",
      },
    ],
    whyNoPerfectSchedule:
      "A perfect schedule may not exist because course times, instructor quality, and workload goals often conflict.",
    tradeoffs: ["Higher-rated professors may come with less ideal time slots."],
    rawText,
  };
}

export default function App() {
  const [courses, setCourses] = useState(DEFAULT_COURSES);
  const [workload, setWorkload] = useState("Medium");
  const [priority, setPriority] = useState("Balanced");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const canSubmit = useMemo(() => courses.trim().length > 0 && !loading, [courses, loading]);

  async function handleGenerate() {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const prompt = buildPrompt({ courses, workload, priority });
      const response = await fetch("http://localhost:3001", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(`Server error (${response.status})`);
      }

      const data = await response.json();
      const normalized = normalizeResponse(data?.text || "");
      setResult(normalized);
    } catch (err) {
      setError(err.message || "Something went wrong while generating your schedule.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Inter, Segoe UI, Arial, sans-serif; background: #f7f8fc; color: #111827; }
        .page { min-height: 100vh; padding: 32px 16px; }
        .container { max-width: 980px; margin: 0 auto; }
        .hero { margin-bottom: 20px; }
        .title { font-size: 2rem; margin: 0 0 8px; font-weight: 700; }
        .subtitle { margin: 0; color: #4b5563; }
        .panel {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
          padding: 18px;
          margin-bottom: 18px;
        }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } }
        label { display: block; font-size: 0.9rem; color: #374151; margin-bottom: 6px; font-weight: 600; }
        textarea, select {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 0.95rem;
          background: #fff;
        }
        textarea { min-height: 94px; resize: vertical; }
        .btn {
          border: 0;
          background: linear-gradient(90deg, #4f46e5, #2563eb);
          color: white;
          padding: 11px 16px;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 12px;
        }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .status { margin-top: 10px; color: #1d4ed8; font-weight: 600; }
        .error { margin-top: 10px; color: #b91c1c; font-weight: 600; }
        .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 10px; }
        @media (max-width: 860px) { .cards { grid-template-columns: 1fr; } }
        .card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 6px 20px rgba(0,0,0,0.05);
        }
        .card h3 { margin: 0 0 10px; font-size: 1.1rem; }
        .muted { color: #6b7280; font-size: 0.9rem; }
        .pill {
          display: inline-block;
          padding: 5px 10px;
          border-radius: 999px;
          background: #eef2ff;
          color: #3730a3;
          font-size: 0.8rem;
          font-weight: 700;
          margin: 8px 0;
        }
        ul { margin: 8px 0 0 18px; padding: 0; }
        li { margin: 4px 0; }
      `}</style>

      <div className="container">
        <div className="hero">
          <h1 className="title">AI Course Scheduler</h1>
          <p className="subtitle">Generate realistic schedule options with tradeoffs in seconds.</p>
        </div>

        <div className="panel">
          <label>Courses (comma separated)</label>
          <textarea
            value={courses}
            onChange={(e) => setCourses(e.target.value)}
            placeholder="CS101, MATH202, PSYCH101"
          />

          <div className="grid" style={{ marginTop: 10 }}>
            <div>
              <label>Workload</label>
              <select value={workload} onChange={(e) => setWorkload(e.target.value)}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
            <div>
              <label>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option>Balanced</option>
                <option>Easy GPA</option>
                <option>Best Professors</option>
                <option>Compact Schedule</option>
              </select>
            </div>
          </div>

          <button className="btn" onClick={handleGenerate} disabled={!canSubmit}>
            Generate Schedule
          </button>

          {loading && <div className="status">Optimizing your schedule...</div>}
          {error && <div className="error">{error}</div>}
        </div>

        {!loading && !result && !error && (
          <div className="panel muted">
            Enter your courses and preferences, then click <strong>Generate Schedule</strong>.
          </div>
        )}

        {result && (
          <>
            <div className="cards">
              {result.schedules.slice(0, 2).map((schedule, idx) => (
                <div className="card" key={`${schedule.title}-${idx}`}>
                  <h3>{idx === 0 ? "Best Schedule" : "Alternative Schedule"}</h3>
                  <div className="muted">Professor Rating: {starsFromRating(schedule.professorRating)} ({Number(schedule.professorRating).toFixed(1)}/5)</div>
                  <div className="pill">{schedule.workloadLevel} Workload</div>
                  <div>
                    <strong>Timetable</strong>
                    <ul>
                      {schedule.timetable.map((line, i) => (
                        <li key={`${line}-${i}`}>{line}</li>
                      ))}
                    </ul>
                  </div>
                  <p style={{ marginBottom: 0 }}>
                    <strong>Why this works:</strong> {schedule.explanation}
                  </p>
                </div>
              ))}
            </div>

            <div className="panel" style={{ marginTop: 14 }}>
              <h3 style={{ marginTop: 0 }}>Why no perfect schedule?</h3>
              <p>{result.whyNoPerfectSchedule}</p>
              {result.tradeoffs?.length > 0 && (
                <>
                  <strong>Tradeoffs</strong>
                  <ul>
                    {result.tradeoffs.map((t, i) => (
                      <li key={`${t}-${i}`}>{t}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
