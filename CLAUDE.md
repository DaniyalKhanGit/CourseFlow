# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ScheduleAI — AI-assisted academic schedule optimizer (MacHacks26 hackathon).

Architecture: React+TS+Vite frontend, Node+Express API layer, Python+FastAPI+OR-Tools solver service.

## Setup

```bash
npm run install:all    # Install all dependencies (root + frontend + server + solver)
npm run dev            # Start all three services concurrently
```

Individual services:
- `npm run dev:frontend` — Vite dev server on :5173
- `npm run dev:server` — Express API on :3001
- `npm run dev:solver` — FastAPI solver on :8000

Frontend proxies `/api` requests to the Express server.

Environment: Copy `.env.example` to `.env` and fill in `OPENAI_API_KEY`. The app works without it (keyword-based fallback), but NL parsing and explanations improve with the real API.

## Code Style

- TypeScript preferred over plain JavaScript
- React functional components only
- Inter font family for UI

## Architecture Boundaries

- **Frontend** (`frontend/`): React UI only. Calls Node API, never calls Python solver directly.
- **Node API** (`server/`): Orchestration layer. Calls Python solver for schedule generation, OpenAI for NL parsing and explanations. Validates all LLM output before using it.
- **Python solver** (`solver/`): Pure constraint solving. Takes structured input, returns ranked schedules. No LLM calls. Deterministic.
- **OpenAI**: Used ONLY for preference parsing (NL → structured JSON) and explanation generation. Never generates schedules directly.

## Workflow

- Two-person team — keep commits focused and PRs small for easy review
- Explain key decisions briefly as you make them
- Preserve a working state at every step
