# CodeStreak

Course-based accountability for programming students. Four modules — Daily
Challenges, Check-ins, Sprint Board, and AI Journal — feed a unified
per-student streak and heatmap that instructors can monitor across a class.

## Features

- **Daily Challenges** — instructors schedule a challenge per day (manually or
  AI-generated from a topic/syllabus excerpt); students submit code once per
  challenge.
- **Check-ins** — a once-a-day note per course, timezone-aware duplicate
  prevention.
- **Sprint Board** — per-project Kanban (`TODO` → `IN_PROGRESS` → `IN_REVIEW` →
  `DONE`); each student has their own board within a shared project, and
  instructors can switch between students' boards.
- **AI Journal** — a short GPT-generated reflection is triggered after a
  challenge submission, check-in, or completed sprint task.
- **Streak + heatmap** — a per-course streak (current/longest/total active
  days) and a GitHub-style activity heatmap, computed from which of the three
  activity sources (challenge/check-in/sprint task) a course's `streakRules`
  count toward it.
- **Instructor dashboard** — class overview (enrollment, average streak,
  at-risk list), roster, per-student detail drawer with submission/check-in
  history, course settings (streak rules, visibility, invite code, archive).
- **Course discovery** — join by invite code or from a public course listing.

## Tech Stack

- **Next.js 16** (App Router, TypeScript, Server Actions, Proxy — the
  Middleware successor)
- **React 19**
- **Tailwind CSS v4**
- **Firebase Auth** — email/password, `httpOnly` session cookies, role-based
  redirects
- **Firestore** — via Firebase Admin SDK (server) and Firebase Client SDK
  (browser)
- **OpenAI** — `gpt-4o-mini` for AI challenge drafts, `gpt-4o` for journal
  reflections
- **Lucide React** — icons
- **Vitest** — characterization tests for the streak/heatmap math

## Architecture

The backend is layered — `lib/auth/` → `lib/repositories/` → `lib/domain/` /
`lib/services/` → `lib/actions/*.ts` (orchestration only) → `app/**/page.tsx`.
See **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)** for the full breakdown,
including an intentional inconsistency in how two of the streak/heatmap call
sites treat a course's `streakRules` (preserved deliberately, not a bug to
fix in passing).

## Project Structure

```
app/
  (auth)/                  login + signup pages (public)
  (student)/               student dashboard + sidebar layout
    dashboard/student/     overview, daily challenge, check-in, sprint, journal
    courses/               join by invite code or public listing
  (instructor)/            instructor dashboard + sidebar layout
    dashboard/instructor/  class overview, roster, challenges, sprint, settings
                           [courseId]/students/[studentId]/ — submission & check-in history
  join/[inviteCode]/       public invite-code landing page
  api/auth/session/        session-cookie create/delete route handler
  layout.tsx               root layout — fonts, global CSS
  page.tsx                 marketing/landing page

lib/
  firebase/
    client.ts              Firebase Client SDK (auth, firestore)
    admin.ts                Firebase Admin SDK (adminAuth, adminDb)
    types.ts                TypeScript interfaces for every Firestore document
  auth/
    session.ts              session-cookie verification, role checks
  repositories/              one module per Firestore aggregate — the only
                              layer allowed to import adminDb
  domain/
    streak.ts                pure streak/heatmap math (StreakRules-parameterized)
    inviteCode.ts             generateInviteCode()
    time.ts                   getStartOfDayUTC(timezone)
  services/openai/
    client.ts                 lazy OpenAI client
    challengeGeneration.ts     AI challenge drafts
    journalReflection.ts       AI journal reflections
  actions/*.ts                "use server" — orchestration only, one file per
                              feature area (auth, courses, challenges, checkins,
                              streak, overview, instructor, projects, journal)
  streak/calculate.ts         standalone streak/heatmap helper feeding two
                              currently-unmounted components (StreakSummary,
                              ActivityHeatmap)

components/                 shared UI (some "use client" — see docs/ARCHITECTURE.md
                             for which layers a client component may call into)

proxy.ts                     Next 16 Proxy (renamed Middleware) — protects
                             /dashboard/*, redirects by role from the JWT claim

scripts/seed.ts              Firestore seed script (everything except /users)
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Firebase project setup

1. Go to [Firebase Console](https://console.firebase.google.com) and create a project.
2. Enable **Authentication → Email/Password** sign-in.
3. Enable **Firestore Database** in production mode.
4. Register a **Web App** — copy the client config values.
5. Go to **Project Settings → Service Accounts → Generate new private key** — download the JSON.

### 3. OpenAI setup

Create an API key at [platform.openai.com](https://platform.openai.com/api-keys) — used for AI challenge generation and journal reflections.

### 4. Populate `.env.local`

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_FIREBASE_*` | Firebase Console → Project Settings → Your Web App |
| `FIREBASE_ADMIN_PROJECT_ID` | Service account JSON → `project_id` |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Service account JSON → `client_email` |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Service account JSON → `private_key` (include the full string with `\n`) |
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com/api-keys) → API Keys |
| `NEXT_PUBLIC_APP_URL` | Your app's public URL (`http://localhost:3000` for local dev) |

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. (Optional) Seed sample data

```bash
npm run seed
```

Populates Firestore with a sample course, challenges, check-ins, sprint data,
and streak entries for two Firebase Auth UIDs you provide — see the header
comment in [`scripts/seed.ts`](scripts/seed.ts) for exact prerequisites.

## Available Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (also type-checks the whole project) |
| `npm run start` | Run a production build |
| `npm run lint` | ESLint |
| `npm run test` | Run the Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run seed` | Populate Firestore with sample data |

## Testing

`npm run test` runs the characterization tests covering the streak/heatmap
math in `lib/domain/streak.ts` and its call sites — the highest-risk, easiest
to silently break logic in the app. There's no broader test suite; everything
else is verified manually against the dev server (see
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#testing-strategy) for what's
covered and what isn't).

## Roles

| Role | Post-login destination | Access |
|---|---|---|
| `INSTRUCTOR` | `/dashboard/instructor` | Create/manage courses, schedule or AI-generate challenges, view roster + per-student detail, manage sprint projects, configure streak rules & visibility |
| `STUDENT` | `/dashboard/student` | Complete the daily challenge, check in, work the sprint board, read AI journal reflections, join courses by invite code or public listing |

Role is stored as a Firebase Auth **custom claim** (`role`) and mirrored in
the `/users/{uid}` Firestore document. See
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#auth-flow) for the full session
lifecycle.

## Firestore Collections

See [`lib/firebase/types.ts`](lib/firebase/types.ts) for full TypeScript
interfaces, and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for which
`lib/repositories/*.ts` module owns each path.

| Path | Contents |
|---|---|
| `/users/{uid}` | Profile + role |
| `/courses/{courseId}` | Course metadata, invite code, streak rules, visibility |
| `/courses/{courseId}/enrollments/{uid}` | Student enrollment |
| `/courses/{courseId}/challenges/{challengeId}` | Daily challenges |
| `/courses/{courseId}/projects/{projectId}` | Sprint projects (scoped to all students or a subset) |
| `/courses/{courseId}/projects/{projectId}/studentBoards/{studentId}/tasks/{taskId}` | Per-student sprint Kanban tasks |
| `/students/{uid}/courses/{courseId}` | Denormalized "hub doc" — lets a student's enrolled-course list be read without querying every course's enrollments |
| `/students/{uid}/courses/{courseId}/challengeSubmissions/{submissionId}` | Code submissions |
| `/students/{uid}/courses/{courseId}/checkIns/{checkInId}` | Daily check-in notes |
| `/students/{uid}/courses/{courseId}/streakEntries/{date}` | Per-day streak record (which sources fired) |
| `/students/{uid}/courses/{courseId}/journalEntries/{entryId}` | AI-generated reflections |
| `/students/{uid}/courses/{courseId}/sprintCards/{cardId}` | Legacy Kanban snapshot — read-only from the app, written only by `scripts/seed.ts` |

## Session Cookie Flow

1. User signs in → client SDK returns an ID token.
2. ID token is sent to `app/api/auth/session/route.ts` → `adminAuth.createSessionCookie()` creates a session cookie.
3. Cookie is set as `httpOnly` on the response.
4. `proxy.ts` reads the cookie on every `/dashboard/*` request and decodes the JWT's `role` claim for fast, DB-free routing.
5. Server Actions and layouts verify the cookie fully via `lib/auth/session.ts`.

Full detail (including the non-throwing vs. redirect-on-failure variants) is
in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#auth-flow).
