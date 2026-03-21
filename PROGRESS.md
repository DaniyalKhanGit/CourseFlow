# ScheduleAI — Progress & Status

## What Exists

### Python Solver (`solver/`)
- FastAPI service on port 8000
- OR-Tools CP-SAT constraint solver finds all valid (non-overlapping) schedules
- 7 seeded courses (COMP250, MATH240, COMP206, ECSE200, COMP273, PHIL230, COMP302) with 2-4 sections each
- Sections have professors, ratings (1.0-5.0 or null), days, times, rooms
- Scoring/ranking based on preferences: time preference, professor ratings, gap minimization, day-off preference, early/late avoidance
- Endpoints: GET /health, GET /courses, POST /solve
- Uses repo-local venv at `solver/venv/`

### Node API (`server/`)
- Express server on port 3001
- Proxies to Python solver for schedule generation
- OpenAI integration for NL preference parsing and explanation generation
- Keyword-based fallback when no OPENAI_API_KEY is set (handles: morning/afternoon/evening, best professors, minimize gaps, avoid early/late, days off)
- Fallback explanation generates basic stats (time range, avg rating, what changed)
- Endpoints: GET /api/health, GET /api/courses, POST /api/solve, POST /api/reoptimize
- All LLM output is validated against a known schema before use

### Frontend (`frontend/`)
- React + TypeScript + Vite on port 5173
- Vite proxies /api to Express server
- 3-column layout: left sidebar, calendar, right sidebar
- Left sidebar: course checkboxes, ranked schedule cards (score, avg rating, time range)
- Center: Google Calendar-inspired weekly grid (Mon-Fri, 8am-6pm), color-coded course blocks with professor + rating
- Right sidebar: active preference chips, AI explanation panel
- Bottom: prompt bar for natural language re-optimization
- Inter font, muted pastel color palette, subtle shadows

### Infrastructure
- Root `package.json` with `npm run dev` (concurrently starts all 3 services)
- `.env.example` with OPENAI_API_KEY placeholder
- `.gitignore` covers node_modules, venv, dist, __pycache__, .env, CLAUDE.local.md

## What Works End-to-End
- Checking courses → solver generates ranked schedules → calendar renders them
- Clicking schedule cards switches the calendar view
- Typing prompts like "move classes to the afternoon" → fallback parser extracts preferences → solver re-ranks → calendar updates → explanation panel shows what changed
- Professor ratings display on calendar blocks
- Empty/loading states

## What Needs To Be Done

### High Priority (Demo-Critical)
1. **Add OPENAI_API_KEY and test with real OpenAI** — the fallback works but real NL parsing handles more varied prompts and generates better explanations. Copy `.env.example` to `.env`, add key, restart server.
2. **Server needs to load .env** — install `dotenv` in server or add `--env-file .env` to the dev script so the Express server actually reads the API key.
3. **Visual polish pass** — open the app in browser and check:
   - Calendar block sizing for short classes (30-60 min blocks may be too cramped for text)
   - Responsive behavior if window is narrow
   - Whether schedule card active state is clearly visible
   - Prompt bar placeholder text readability
4. **Loading/transition animations** — calendar blocks have CSS transitions defined but the actual state change may appear abrupt. May need fade-out-fade-in or skeleton loading.
5. **Impossible schedule state** — when no valid schedule exists (too many conflicts), the explanation should suggest which course to drop. Currently shows a generic message.

### Medium Priority (Polish)
6. **Schedule comparison on switch** — when clicking a different schedule card, the explanation should update to describe that schedule (currently only updates on reoptimize).
7. **Preference reset** — no way to clear preferences and go back to default ranking. Add a "Reset preferences" button.
8. **Tooltip on calendar blocks** — hover title is set but a proper styled tooltip would look better than the browser default.
9. **Error handling for solver being down** — if you start the frontend+server but not the solver, the error message could be more specific.
10. **Mobile/tablet layout** — currently designed for desktop only. The 3-column layout will break on small screens.

### Low Priority (Nice-to-Have)
11. **More sample data** — add tutorials/labs as linked sections that must accompany a lecture section.
12. **Drag-and-drop section swapping** — let users manually swap a section by dragging.
13. **Export schedule** — download as image or copy as text.
14. **Dark mode** — the muted palette would adapt well.
15. **Persist state** — localStorage or URL params so refreshing doesn't lose selections.

## Known Issues
- Background services (solver, server, vite) need to be started manually or via `npm run dev`. They don't auto-restart on crash.
- The root `npm run dev:solver` script uses `./venv/Scripts/uvicorn` which is Windows-specific. On Mac/Linux it would be `./venv/bin/uvicorn`.
- Python 3.14 is installed; all deps work but it's bleeding-edge. If issues arise, Python 3.12 is safer.
- `concurrently` in root package.json starts all 3 services but if one fails, the others keep running (no health-check linkage).

## File Structure
```
MacHacks26/
├── .env.example              # Copy to .env, add OPENAI_API_KEY
├── CLAUDE.md                 # Instructions for Claude Code
├── package.json              # Root scripts (dev, install:all)
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts        # Proxies /api to :3001
│   ├── tsconfig*.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx            # Main layout + state management
│       ├── App.css            # All styles
│       ├── types.ts           # Shared TypeScript interfaces
│       ├── api/client.ts      # Fetch wrappers
│       └── components/
│           ├── Calendar.tsx    # Weekly grid
│           ├── LeftSidebar.tsx # Course picker + schedule cards
│           ├── RightSidebar.tsx# Explanation + preference chips
│           └── PromptBar.tsx   # NL input bar
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts           # Express app entry
│       ├── routes/
│       │   ├── solve.ts       # /api/courses, /api/solve
│       │   └── reoptimize.ts  # /api/reoptimize
│       └── services/
│           └── openai.ts      # NL parsing + explanations + fallbacks
└── solver/
    ├── requirements.txt
    ├── main.py                # FastAPI app
    ├── solver.py              # OR-Tools constraint solver
    ├── sample_data.py         # 7 courses, 17 sections
    └── venv/                  # Python virtual environment
```
