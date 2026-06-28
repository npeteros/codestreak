# CodeStreak

Course-based accountability for programming students. Four modules — Daily Challenges, Check-ins, Sprint Board, and AI Journal — feed a unified per-student streak.

## Tech Stack

- **Next.js 16** (App Router, TypeScript, Server Actions)
- **Tailwind CSS v4**
- **Firebase Auth** — email/password, session cookies, role-based redirects
- **Firestore** — via Firebase Admin SDK (server) and Firebase Client SDK (browser)
- **shadcn/ui** — base components (install after env is configured)
- **Lucide React** — icons
- **Anthropic API** — AI journal reflections

## Project Structure

```
app/
  (auth)/          login + signup pages (public)
  (student)/       student dashboard + sidebar layout
  (instructor)/    instructor dashboard + sidebar layout
  layout.tsx       root layout — DM fonts, global CSS
  page.tsx         landing page

lib/
  firebase/
    client.ts      Firebase Client SDK (auth, firestore)
    admin.ts       Firebase Admin SDK (adminAuth, adminDb)
    types.ts       TypeScript interfaces for all Firestore documents
  actions/
    auth.ts        signUp / logIn / logOut
    courses.ts     createCourse / getCourseByInviteCode / enrollStudent
    challenges.ts  createChallenge / getTodayChallenge / submitChallenge
    checkins.ts    createCheckIn
    sprint.ts      createSprintCard / updateCardStatus
    streak.ts      recordStreakActivity / getStreakEntries
    journal.ts     generateJournalEntry

middleware.ts      Protects /dashboard/* — verifies session cookie, redirects by role
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

### 3. Populate `.env.local`

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
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys |

### 4. Install shadcn/ui (optional, after env is ready)

```bash
npx shadcn@latest init
```

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Roles

| Role | Post-login destination | Access |
|---|---|---|
| `INSTRUCTOR` | `/dashboard/instructor` | Create courses, manage challenges, view students |
| `STUDENT` | `/dashboard/student` | Complete challenges, check in, sprint board, journal |

Role is stored as a Firebase Auth **custom claim** (`role`) and mirrored in the `/users/{uid}` Firestore document.

## Firestore Collections

See [`lib/firebase/types.ts`](lib/firebase/types.ts) for full TypeScript interfaces.

| Path | Contents |
|---|---|
| `/users/{uid}` | Profile + role |
| `/courses/{courseId}` | Course metadata, invite code, streak rules |
| `/courses/{courseId}/enrollments/{uid}` | Student enrollment |
| `/courses/{courseId}/challenges/{challengeId}` | Daily challenges |
| `/courses/{courseId}/milestones/{milestoneId}` | Sprint milestones |
| `/students/{uid}/courses/{courseId}/challengeSubmissions/` | Code submissions |
| `/students/{uid}/courses/{courseId}/checkIns/` | Daily check-in notes |
| `/students/{uid}/courses/{courseId}/sprintCards/` | Kanban cards |
| `/students/{uid}/courses/{courseId}/streakEntries/` | Per-day streak record |
| `/students/{uid}/courses/{courseId}/journalEntries/` | AI-generated reflections |

## Session Cookie Flow

1. User signs in → client SDK returns an ID token
2. ID token is sent to a Route Handler → `adminAuth.createSessionCookie()` creates a 14-day cookie
3. Cookie is set as `httpOnly` on the response
4. Middleware reads the cookie on every `/dashboard/*` request and decodes the JWT for fast routing
5. Server components verify the cookie fully with `adminAuth.verifySessionCookie()`
