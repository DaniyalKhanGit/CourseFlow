# ScheduleAI — Progress & Status

## What Exists

### Python Solver (`solver/`)
- FastAPI service on port 8000
- OR-Tools CP-SAT constraint solver finds all valid (non-overlapping) schedules
- 7 seeded courses (COMP250, MATH240, COMP206, ECSE200, COMP273, PHIL230, COMP302) with 2-4 sections each
- Sections have professors, ratings (1.0-5.0 or null), days, times, rooms
- Scoring/ranking based on preferences: time preference, professor ratings, gap minimization, day-off preference, early/late avoidance, **travel time between buildings**
- **Supabase integration**: fetches course/section data from Supabase `sections` table if `SUPABASE_URL` and `SUPABASE_KEY` are set; falls back to local seeded data otherwise
- **Travel time awareness**: building-to-building walking times defined (BURN, MAAS, ENGM, ARTS); solver rejects schedules with impossible transitions (gap < travel time) as a hard constraint, and penalizes tight transitions in scoring
- Endpoints: GET /health, GET /courses, POST /solve
- Uses repo-local venv at `solver/venv/`

### Node API (`server/`)
- Express server on port 3001
- Proxies to Python solver for schedule generation
- OpenAI integration for NL preference parsing and explanation generation
- **AI explanations mention travel-time tradeoffs** when relevant (building transitions, tight gaps)
- Keyword-based fallback when no OPENAI_API_KEY is set (handles: morning/afternoon/evening, best professors, minimize gaps, avoid early/late, days off)
- Fallback explanation generates basic stats (time range, avg rating, what changed)
- Endpoints: GET /api/health, GET /api/courses, POST /api/solve, POST /api/reoptimize
- All LLM output is validated against a known schema before use

### Frontend (`frontend/`)
- React + TypeScript + Vite on port 5173
- Vite proxies /api to Express server
- 3-column layout: left sidebar, calendar, right sidebar
- Left sidebar: course checkboxes with **Required/Wanted toggle** per course, **blocked time slot selector**, **Generate Schedule button**, ranked schedule cards (score, avg rating, time range)
- Center: Google Calendar-inspired weekly grid (Mon-Fri, 8am-6pm), color-coded course blocks with professor + rating, **blocked slot overlays**
- Right sidebar: active preference chips, AI explanation panel
- Bottom: prompt bar for natural language re-optimization (disabled until schedule generated)
- **Clickable calendar blocks**: clicking a class block opens a **detail modal** showing course code, name, section, days, time, room, professor, rating, and Required/Wanted badge
- No schedule shown until user clicks Generate — clean pre-schedule setup flow
- Inter font, muted pastel color palette, subtle shadows

### Infrastructure
- Root `package.json` with `npm run dev` (concurrently starts all 3 services)
- `.env.example` with OPENAI_API_KEY, SUPABASE_URL, SUPABASE_KEY placeholders
- `.gitignore` covers node_modules, venv, dist, __pycache__, .env, CLAUDE.local.md

## What Works End-to-End
- Selecting courses with Required/Wanted priority → specifying blocked time slots → clicking Generate Schedule → solver generates ranked schedules → calendar renders them
- Clicking schedule cards switches the calendar view
- Clicking a calendar block opens a detail modal with full course/section info
- Typing prompts like "move classes to the afternoon" → fallback parser extracts preferences → solver re-ranks → calendar updates → explanation panel shows what changed
- Professor ratings display on calendar blocks
- Blocked time slot overlays shown on calendar
- Travel time between buildings affects both schedule feasibility (hard constraint) and ranking (soft penalty)
- Supabase course catalog used when configured; seamless fallback to local data
- Empty/loading states

## Changelog

### Session 3 — Supabase + Travel Time
**Files modified:**
- `solver/requirements.txt` — added `httpx>=0.28.0` for Supabase REST calls
- `solver/sample_data.py` — added building travel time matrix (BURN, MAAS, ENGM, ARTS), `get_building()`, `get_travel_minutes()` functions
- `solver/solver.py` — imported `get_travel_minutes`; added Constraint 4 (hard: reject section pairs where gap < travel time between buildings); added travel time penalty in scoring (-15 to 0 points: impossible=-10, very tight=-3, tight=-1 per transition)
- `solver/main.py` — added Supabase integration via httpx PostgREST API; `_fetch_supabase_courses()` fetches from `sections` table; `_get_all()` and `_get_by_ids()` try Supabase first, fallback to local; updated `/courses` and `/solve` endpoints to use new functions
- `server/src/services/openai.ts` — updated OpenAI explanation prompts to mention travel time between buildings; added room info to schedule summary sent to LLM
- `.env.example` — added `SUPABASE_URL` and `SUPABASE_KEY` placeholders

**Travel time details:**
- Known building pairs: BURN↔MAAS (7 min), BURN↔ENGM (10 min), BURN↔ARTS (8 min), MAAS↔ENGM (6 min), MAAS↔ARTS (9 min), ENGM↔ARTS (12 min)
- Same building = 0 min, unknown pair = 5 min default
- Hard constraint: if gap between consecutive classes < travel time, those two sections cannot both be selected
- Soft scoring: impossible transition = -10 pts, <5 min slack = -3 pts, <10 min slack = -1 pt (capped at -15 total)

**Supabase details:**
- Uses httpx to call Supabase PostgREST API directly (the `supabase` Python SDK doesn't build on Python 3.14)
- Expects a `sections` table with columns: `section_id`, `course_id`, `course_name`, `section_code`, `professor`, `professor_rating`, `days` (json array), `start_time`, `end_time`, `room`
- Falls back gracefully to local seeded data if Supabase is not configured or fetch fails

### Session 2 — Course Selection Flow + Block Detail
**Files modified:**
- `frontend/src/types.ts` — added `CourseSelection`, `BlockedSlot` interfaces; added `priority` field to `Section`
- `frontend/src/App.tsx` — added state for selections, blockedSlots, hasGenerated, selectedBlock; new handleGenerate flow; passes all new props to components
- `frontend/src/App.css` — added styles for priority toggle, blocked slots, generate button, block detail modal
- `frontend/src/api/client.ts` — updated `solveSchedules` and `reoptimize` to send `required_ids`, `wanted_ids`, `blocked_slots`
- `frontend/src/components/LeftSidebar.tsx` — rewrote: course checkboxes with Required/Wanted toggle, blocked time slot form, Generate Schedule button, schedule cards only after generation
- `frontend/src/components/Calendar.tsx` — added blocked slot overlays, `onBlockClick` prop for detail modal
- `frontend/src/components/BlockDetail.tsx` — new component: modal showing full section details with priority badge
- `server/src/routes/solve.ts` — passes `required_ids`, `wanted_ids`, `blocked_slots` to solver
- `server/src/routes/reoptimize.ts` — passes `required_ids`, `wanted_ids`, `blocked_slots` to solver
- `solver/main.py` — added `BlockedSlot` model, passes new fields to solver
- `solver/solver.py` — added required/wanted distinction (required = must-include, wanted = best-effort); added blocked time slot hard constraint; sections tagged with priority in output

## What Needs To Be Done

### High Priority (Demo-Critical)
1. **Add OPENAI_API_KEY and test with real OpenAI** — the fallback works but real NL parsing handles more varied prompts and generates better explanations. Copy `.env.example` to `.env`, add key, restart server.
2. **Server needs to load .env** — install `dotenv` in server or add `--env-file .env` to the dev script so the Express server actually reads the API key.
3. **Add Supabase keys and populate sections table** — set `SUPABASE_URL` and `SUPABASE_KEY` in `.env`, create `sections` table in Supabase with course data.
4. **Visual polish pass** — open the app in browser and check:
   - Calendar block sizing for short classes (30-60 min blocks may be too cramped for text)
   - Responsive behavior if window is narrow
   - Whether schedule card active state is clearly visible
   - Prompt bar placeholder text readability
5. **Loading/transition animations** — calendar blocks have CSS transitions defined but the actual state change may appear abrupt. May need fade-out-fade-in or skeleton loading.

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
- Python 3.14 is installed; the `supabase` Python SDK doesn't build on 3.14 so we use `httpx` to call the PostgREST API directly.
- `concurrently` in root package.json starts all 3 services but if one fails, the others keep running (no health-check linkage).

## File Structure
```
MacHacks26/
├── .env.example              # Copy to .env, add API keys
├── CLAUDE.md                 # Instructions for Claude Code
├── PROGRESS.md               # This file
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
│           ├── Calendar.tsx    # Weekly grid + blocked overlays
│           ├── LeftSidebar.tsx # Course picker + priority + blocked times + generate
│           ├── RightSidebar.tsx# Explanation + preference chips
│           ├── PromptBar.tsx   # NL input bar
│           └── BlockDetail.tsx # Section detail modal
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
    ├── requirements.txt       # fastapi, uvicorn, ortools, pydantic, httpx
    ├── main.py                # FastAPI app + Supabase integration
    ├── solver.py              # OR-Tools constraint solver + travel time
    ├── sample_data.py         # 7 courses, 17 sections, building travel times
    └── venv/                  # Python virtual environment
```
