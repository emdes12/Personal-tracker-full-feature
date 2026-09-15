# Personal Execution System

A personal productivity/goal-execution app: Plan → Goal → Target (milestone/monthly/weekly) → Daily Task → completion, with progress derived automatically from actual completions and carried-over tasks tracked explicitly.

## Stack

- **Backend**: Node.js + TypeScript, Express, Knex (query builder + migrations), PostgreSQL. Modular monolith under `backend/src/domains/*`.
- **Frontend**: Vue 3 (Composition API) + TypeScript, Vue Router, Pinia, Tailwind CSS v4, Vite.
- **AI assistant** (optional): Google Gemini via its OpenAI-compatible endpoint.

## Prerequisites

- Node.js 20+
- PostgreSQL running locally (or reachable via `DATABASE_URL`)

## First-time setup

1. **Database**: create a database and a role for the app (adjust names/password as you like):

   ```sql
   CREATE ROLE tracker_app WITH LOGIN PASSWORD 'your-password';
   CREATE DATABASE personal_tracker OWNER tracker_app;
   ```

2. **Backend env**: copy `backend/.env.example` to `backend/.env` and fill in:
   - `DATABASE_URL` — e.g. `postgresql://tracker_app:your-password@localhost:5432/personal_tracker`
   - `JWT_SECRET` — a long random string (generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
   - `GOOGLE_AI_API_KEY` — optional, enables the AI assistant. Get one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and copy it directly (don't retype it — a single mistyped character is enough for Google to reject it as `API_KEY_INVALID`). Leave blank to run without AI — every other feature works fully without it.

3. **Install deps** (from repo root):

   ```bash
   npm install
   ```

4. **Run migrations**:

   ```bash
   npm run migrate
   ```

   (To create a new migration later: `npm run migrate:make -- <name>`, then edit the generated `.cjs` file under `backend/src/db/migrations`.)

5. **Start both apps** (two terminals, from repo root):

   ```bash
   npm run dev:backend   # http://localhost:4000
   npm run dev:frontend  # http://localhost:5173
   ```

Open http://localhost:5173, sign up, and you're in — Today is the landing page.

## Project layout

```
backend/src/
  db/index.ts       the Knex instance (camelCase<->snake_case mapping — see caseMap.ts)
  db/types.ts       row interfaces (camelCase) for every table, replacing Drizzle's inferred types
  db/migrations/    Knex migrations (.cjs)
  domains/          auth, areas, plans, goals, targets, tasks (+occurrences, +recurrence),
                     progress, today, notes, sleep, reviews, reminders, history, search,
                     streaks, analytics, ai
  middleware/       requireAuth, error handling
  lib/              timezone-aware date helpers, error classes

frontend/src/
  views/            Today, Dashboard, Goals, GoalDetail, Plans, Calendar, History, Review,
                     Search, Assistant, Login, Signup
  components/       AppShell (nav), TaskRow, ProgressBar, SleepWidget, Icon, ToastHost,
                     SkeletonCards, EmptyState
  composables/      useReminderPolling, useToast
  stores/           auth (pinia)
  api/              typed fetch client per backend domain
```

## What's implemented

**Phase 1 — core execution loop**
- Email/password auth (httpOnly JWT cookie), per-user data isolation.
- Areas (seeded defaults + custom), Plans, Goals, Targets (nestable milestone/monthly/weekly), Tasks + dated Task Occurrences.
- Automatic progress rollup: occurrence → target (incl. nested children) → goal, computed from actual completions, never stored.
- Goal deadline health (on track / at risk / behind).
- Today view: today's tasks, auto-surfaced carried-over tasks from previous days, live completion %, Now/Up Next.
- Carry-over via lineage (reschedule creates a new occurrence, preserves history) plus skip/cancel/reopen.
- Mobile-first responsive UI.

**Phase 2 — full daily-use loop**
- Recurring tasks (daily/weekdays/weekly/monthly/custom), lazily generated on a rolling 14-day window; each occurrence is independent (completing today's never touches tomorrow's).
- Reminders: created per-occurrence (at start / 5 / 10 / 15 min before), fired via frontend polling (`GET /reminders/due` every 30s) + browser Notification API — no backend job infra.
- Notes: attach to a task occurrence (quick-capture from the Today list), searchable globally.
- Sleep tracking: quick-log widget on Today, shows duration vs. target.
- Daily review: end-of-day stats (completed/incomplete/carried-over/skipped, focus time, sleep, goals worked on) plus the three reflection prompts from the spec, persisted per day.
- History: browse any date range, see completion % and sleep per day, drill into a day's review.
- Calendar: weekly agenda view of scheduled tasks.
- Global search across goals, plans, targets, tasks, notes, and daily reviews.

**Phase 3 — analytics**
- Focus timer per task (start/stop, persists across reloads), rolled up into a goal's "focused hours" and "days active."
- Dashboard: this week/month completion, per-goal progress, 7-day sleep average, current + longest streak, all-time totals.
- Streaks (current + longest, overall and per-goal) — a supporting metric, not the primary measurement.
- Richer history: per-day goals-worked-on and focus time alongside completion/sleep.

**Phase 4 — AI assistant**
- Chat-based planning assistant (Gemini, via its OpenAI-compatible endpoint) that can answer progress questions ("why am I behind on X") using real goal/progress data, and propose — never silently create — tasks or goal-breakdown targets via tool-calling; the user reviews and explicitly confirms each proposal before anything is written.
- The app works fully without this configured — `GOOGLE_AI_API_KEY` unset just disables the Assistant page with a clear message, per the spec's "AI must never be required" rule.

## Not yet built

Focus-timer Pomodoro-style presets, drag-to-reschedule on the calendar, deeper analytics trend charts.
