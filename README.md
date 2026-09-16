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
                     SkeletonCards, EmptyState, MarkdownContent, TrendChart
  composables/      useReminderPolling (web), useNativeAlarms (Capacitor native), useToast
  lib/              alarmSound.ts (Web Audio synthesized alarm beeps)
  stores/           auth (pinia)
  api/              typed fetch client per backend domain
  android/, ios/    Capacitor native projects (see "Mobile app" below)
```

## Recent additions

- **AI responses render as Markdown** (`MarkdownContent.vue`, via `marked` + `DOMPurify`) — the assistant's system prompt asks for bold/lists/headings where they help; user messages stay plain text.
- **Pomodoro-style focus presets**: the Focus button on any task offers 25 min / 50 min / no-limit. A chosen preset counts down instead of up and auto-stops (with a toast + browser notification) when it hits zero — purely a client-side overlay on the existing open-ended focus session, no schema change.
- **Drag-to-reschedule on the Calendar**: drag any open task onto a different day to reschedule it (native HTML5 drag-and-drop); goes through the same reschedule-by-lineage endpoint as the "Carry to tomorrow" menu action, so history stays intact.
- **Deeper analytics trend charts** on the Dashboard: `GET /analytics/trends` returns 8-week and 6-month completion-% buckets (`backend/src/domains/analytics/service.ts`), rendered as single-hue bar charts with a per-bar hover tooltip (`TrendChart.vue`).
- **Automatic start/end task alarms**: every open task with a start and/or end time now gets a push notification + alarm sound automatically — a start alarm 5 minutes before it begins, an end alarm the moment it ends. Nothing to opt into; replaces the old manual "Remind me" checkbox. On the web this is a foreground poll (`useReminderPolling`, every 15s) with a synthesized Web Audio beep; on the mobile app it's real OS-scheduled notifications (`useNativeAlarms`) that keep firing even while the app is backgrounded. See "Mobile app" below.

**Notable bug fixed while building these**: `TodayView.vue` and `CalendarView.vue` were re-setting `loading = true` on *every* reload — including reloads triggered by a child task's own action (complete/focus/reschedule) — which flips the template's `v-if="loading"` / `v-else-if="view"` branch and unmounts every `TaskRow`, silently discarding any in-flight local state (a running Pomodoro countdown, an open menu). Fixed by only showing the loading skeleton on the true first load (`view.value === null`) or an explicit week change; reloads after a task action now patch the existing list in place instead of tearing it down. Worth keeping in mind for any other view with a similar `v-if="loading"` guard around a list of stateful children.

## Mobile app (iOS / Android)

The frontend is wrapped as a native app with [Capacitor](https://capacitorjs.com/) — same Vue codebase, no separate app to maintain. `frontend/android/` and `frontend/ios/` are the generated native projects; `frontend/capacitor.config.ts` is the app config (`appId: com.execute.tracker`).

**Already done in this repo:**
- `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`, `@capacitor/app`, `@capacitor/local-notifications` installed in `frontend/`.
- `android/` and `ios/` native projects scaffolded (`npx cap add android` / `ios`) and synced with the current web build.
- `useNativeAlarms.ts` composable: on a native build it fetches `GET /reminders/upcoming` (next 36h) on launch and whenever the app returns to the foreground, and schedules them as real OS local notifications via `@capacitor/local-notifications` — this is what lets alarms fire even if the app isn't open, which a browser-tab poll can never do. `App.vue` picks this vs. the web polling composable via `Capacitor.isNativePlatform()`.

**What you still need to do locally to produce an installable build** — this dev environment is Windows with no Android SDK/Gradle/Java and no Mac, so neither of these could be completed here:

- **Android (APK/AAB)**: install [Android Studio](https://developer.android.com/studio) (bundles the SDK + Gradle). Then:
  ```bash
  cd frontend
  npm run cap:android   # builds the web app, syncs it, opens android/ in Android Studio
  ```
  In Android Studio: `Build → Generate Signed Bundle / APK`, choose APK (for sideloading/testing) or Android App Bundle (for Play Store), create/select a signing keystore, build.
- **iOS (IPA)**: requires a Mac with Xcode installed. Then:
  ```bash
  cd frontend
  npm run cap:ios   # builds the web app, syncs it, opens ios/ in Xcode
  ```
  In Xcode: select a Team under Signing & Capabilities (needs an Apple Developer account for a real device or TestFlight/App Store), then `Product → Archive` to produce an IPA.
- Whenever frontend source changes and you want the native apps to pick them up, re-run `npm run cap:sync` (or the `cap:android`/`cap:ios` scripts above, which do it for you) before rebuilding in Android Studio/Xcode.
- Android 13+ and iOS both require the user to grant a notification permission at runtime — `useNativeAlarms` requests it automatically on first launch; if denied, alarms silently won't fire (same as the web Notification API).
- No custom alarm sound file is bundled yet — notifications use the OS default sound. To use a custom sound, drop a `.wav` into `android/app/src/main/res/raw/` and `ios/App/App/` (added to the Xcode project) and reference it via `sound:` in the `LocalNotifications.schedule()` call in `useNativeAlarms.ts`.
