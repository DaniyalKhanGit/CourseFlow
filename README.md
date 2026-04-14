# CourseFlow

Course registration is one of the most frustrating parts of university. Full classes, scheduling conflicts, professor preferences, workload balance — there are a dozen variables to juggle, and most students end up compromising on things that actually matter to them.

CourseFlow is an AI-powered scheduler that takes those variables seriously. It builds and optimizes a course schedule around your actual needs, explains every decision it makes, and when a perfect schedule isn't possible, it finds the closest alternative and tells you exactly what tradeoff you're making and why.

## How It Works

You tell CourseFlow what you need — courses, preferences, constraints, and how you want your week to look. A combinatorics-based solver works through the scheduling space to find an arrangement that fits. When conflicts arise, it doesn't just give up or silently drop your preferences; it surfaces alternatives and explains the reasoning behind each one.

The AI agent, powered by the Gemini API, handles the planning and explanation layer. All the scheduling logic itself is deterministic — the solver handles the math, so the agent stays focused on understanding your needs and communicating tradeoffs clearly.

## Tech Stack

**Frontend** — React, HTML, CSS

**Backend** — Node.js, TypeScript

**AI** — Gemini API

**Scheduling** — Python solver using combinatorics

**Database** — Supabase

## Running It Locally

```bash
npm install
npm run dev
```

## What's Next

CourseFlow has a lot of room to grow. The most natural next step is integrating real-time university course data so schedules reflect actual availability, not just constraints you enter manually. After that: professor rating APIs, calendar syncing, and long-term academic planning that spans full semesters or even degree paths.

The goal is to turn something students dread into something that actually works for them — not just optimized, but explainable.

## Built At

MacHacks 2026 — built under strict time constraints as a proof of concept.