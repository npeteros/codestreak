# Architecture

CodeStreak's backend is organized into four layers underneath `app/`, each with
one job. A Server Action should read as a straight line through these layers —
auth guard, then repository call(s), then domain/service call(s), then a
response shape — with no raw Firestore access, auth logic, or business-rule
math inlined at the action or page level.

```
app/**/page.tsx           Server Components — auth + data-fetch for the initial render
        |
lib/actions/*.ts          "use server" — orchestration only (see below)
        |
   ┌────┼──────────┬──────────────┐
   |    |          |              |
lib/auth  lib/repositories  lib/domain  lib/services
session   Firestore access   pure math   external APIs
verification (typed, no      (streak/    (OpenAI, email)
             shaping)         heatmap,
                              invite codes,
                              time helpers)
```

## Layers

### `lib/auth/session.ts`

The single source of truth for "who is making this request." Everything else
that needs identity or role calls into this module rather than touching
cookies or `adminAuth` directly.

| Function | Cost | Use when |
|---|---|---|
| `getUid()` | cookie verify only | you only need the caller's uid (no role check) |
| `getCurrentUser()` | cookie verify + `users/{uid}` read | you need role/name/email |
| `requireRole(role)` | same as above | Server Action should return `{success:false}` on failure |
| `requireUidOrRedirect()` / `requireRoleOrRedirect(role)` | throwing variants | layouts and pages that redirect to `/login` instead of returning an error value |

`proxy.ts` (Next 16's renamed Middleware) is the one exception: it decodes the
`role` custom claim straight off the verified JWT instead of calling
`requireRole()`, deliberately, to avoid a Firestore round-trip on every
navigation. It still shares `verifySessionCookie()` with everything else.

**Rule:** no file outside `lib/auth/` should call `adminAuth.verifySessionCookie`
or read the session cookie directly.

### `lib/repositories/*.ts`

One module per Firestore aggregate (`users`, `courses`, `enrollments`,
`studentHub`, `challenges`, `submissions`, `checkins`, `sprintCards`,
`journal`, `streakEntries`, `projects`). Each wraps raw path construction and
returns typed, un-shaped doc data — `{ id, data }` pairs, not a
caller-specific response. Response shaping (renaming fields, computing
derived values, picking a subset) stays in the action layer, since the same
aggregate is often shaped differently by different callers (e.g. a
submission looks different in `getStudentDetail`'s drawer vs.
`getStudentSubmissionHistory`'s paginated list).

**Rule:** no file outside `lib/repositories/` should import `adminDb` or
build a Firestore path. (`app/api/auth/session/route.ts` is the one
documented exception — it manages the session cookie itself, not app data.)

These are concrete Firestore modules, not interfaces behind a swappable
adapter — that trade-off was made deliberately (see "Decisions" below).

### `lib/domain/*.ts`

Pure, synchronous functions with no I/O. Currently:

- **`streak.ts`** — the canonical streak/heatmap math (`isActiveDay`,
  `getCurrentStreak`, `getLongestStreak`, `getTotalActiveDays`,
  `getHeatmapLevel`, `getHeatmapGrid`/`getLevelsForRange`,
  `getLastActiveDays`, `getClassHeatmap`, `chunkIntoWeeks`). Every function
  takes an explicit `StreakRules`-shaped `rules` parameter — see
  **"The streakRules divergence"** below before touching this file.
- **`inviteCode.ts`** — `generateInviteCode()`.
- **`time.ts`** — `getStartOfDayUTC(timezone)`.

Because a `"use server"` file may only export async functions, callers can't
just `export` a domain function from an actions file directly. Each actions
file that needs domain math has a matching `*.calc.ts` sibling
(`streak.calc.ts`, `overview.calc.ts`, `instructor.calc.ts`) — a thin,
synchronous adapter that calls into `lib/domain/streak.ts` with the right
`rules` argument for that call site. These adapters contain no math of their
own; if you're tempted to add a calculation there, it belongs in
`lib/domain/` instead.

### `lib/services/openai/*.ts`

External API calls, isolated so the rest of the app doesn't know or care
which model/SDK is behind a feature.

- **`client.ts`** — `getOpenAIClient()`, a single lazy-instantiated client.
- **`challengeGeneration.ts`** — `generateChallengeDrafts(lang, topic)`
  (`gpt-4o-mini`, JSON mode) backing the instructor's "Generate AI challenges."
- **`journalReflection.ts`** — `generateJournalReflection(context)`
  (`gpt-4o`) backing the AI journal, plus the `JournalContext` type.

**Rule:** no file outside `lib/services/openai/` should import the `openai`
package or read `OPENAI_API_KEY`.

### `lib/services/email/*.ts`

Isolates the email transport the same way `lib/services/openai/` isolates
the OpenAI SDK.

- **`client.ts`** — `getMailer()`, a single lazy-instantiated Nodemailer
  transporter authenticated against Gmail SMTP (`GMAIL_USER` /
  `GMAIL_APP_PASSWORD`, a Google Account App Password). Falls back to a
  zero-config Ethereal test account when those env vars are unset, so local
  dev works without real credentials — sent mail is logged with an Ethereal
  preview URL instead of hitting a real inbox.
- **`send.ts`** — `sendEmail({ to, subject, react })`, which renders a
  react-email component to HTML via `render` from `react-email` and hands it
  to the transporter. Throws on failure; callers fire-and-forget with
  `.catch`, same as every other side effect in this codebase.

Templates live in the top-level `emails/` directory (react-email's
convention, and where its `email dev` preview CLI — `npm run email:dev` —
looks), not under `lib/`.

**Rule:** no file outside `lib/services/email/` should import `nodemailer`
or read `GMAIL_USER`/`GMAIL_APP_PASSWORD`.

### `lib/actions/*.ts` — orchestration only

Every exported Server Action should be:

1. **Auth guard** — `lib/auth/session.ts`, return `{success:false, error:"unauthenticated"}` (or the throwing variant, for the handful of layouts/pages that redirect).
2. **Repository call(s)** — fetch/write via `lib/repositories/`.
3. **Domain/service call(s)** — run pure math via `lib/domain/` or an external call via `lib/services/`.
4. **Response shape** — assemble exactly what the caller needs, nothing more.

Fire-and-forget side effects (recording a streak entry, triggering a journal
reflection after a check-in/submission/sprint-task-completion, sending a
notification email via `lib/actions/notifications.ts` after a challenge/
project/task is created or a student is nudged) are called without
`await`ing their result, with a `.catch(console.error)` so a failure there
never blocks or fails the primary action.

## The streakRules divergence (read before touching streak/heatmap code)

Four independent streak/heatmap implementations existed before this refactor.
Two of them (`streak.ts::getStreakData`, `overview.ts::getOverviewSummary`)
respect each course's `streakRules` — a day only counts as "active" if the
specific source (`challenge`/`checkin`/`sprintCard`) that fired is one the
course has enabled. The other two (`instructor.ts`'s class/roster/
student-detail views, and the unmounted `lib/streak/calculate.ts`) are
**streakRules-blind** — a day counts as active if *any* source fired,
regardless of course settings.

This is a real, pre-existing inconsistency, not a bug this refactor fixes. It
is preserved **exactly**, per call site:

| Call site | Rules passed |
|---|---|
| `streak.ts::getStreakData`, `overview.ts::getOverviewSummary` | the course's real `streakRules` |
| `instructor.ts` (class overview, roster, student-detail drawer) | `ALL_SOURCES_RULE` (`lib/domain/streak.ts`) |
| `lib/streak/calculate.ts` (unmounted `StreakSummary`/`ActivityHeatmap`) | `ALL_SOURCES_RULE` |

`lib/actions/streakDivergence.test.ts` pins the exact scenario (a course with
`streakRules.sprintCard: false` and a history where only `sprintCard` fired)
that would silently break if someone "fixed" this by passing real rules
everywhere. If you want to actually resolve the inconsistency, that's a
product decision for the user to make explicitly — don't do it as a side
effect of an unrelated change.

## Two sprint-task systems (don't confuse them)

- **Legacy per-course `sprintCards`** — `students/{uid}/courses/{courseId}/sprintCards/{cardId}`,
  a flat `TODO`/`IN_PROGRESS`/`DONE` Kanban snapshot. It's **read-only from
  the app** (`lib/repositories/sprintCards.ts::listSprintCards`) — only
  `scripts/seed.ts` writes to it. It feeds the sprint-progress counts shown
  on the student overview and instructor roster/drawer.
- **Per-project `SprintTask` boards** — `courses/{courseId}/projects/{projectId}/studentBoards/{studentId}/tasks/{taskId}`,
  the live, editable Kanban (`TODO`/`IN_PROGRESS`/`IN_REVIEW`/`DONE`) behind
  `lib/actions/projects.ts` and `components/sprint/SprintBoardClient.tsx`.
  Each student has their own board within a shared project; instructors pick
  a student to view/manage via a board switcher
  (`app/(instructor)/_components/ProjectsSprintClient.tsx`).

These are unrelated data models that happen to both be called "sprint" —
don't assume a change to one applies to the other.

## Auth flow

1. Client SDK sign-in returns an ID token → posted to
   `app/api/auth/session/route.ts`, which calls
   `adminAuth.createSessionCookie()` and sets it `httpOnly`.
2. `proxy.ts` runs on every `/dashboard/*` request, decodes the JWT's `role`
   custom claim (no Firestore read) and redirects instructor↔student
   cross-navigation.
3. Layouts/pages call `lib/auth/session.ts`'s throwing variants
   (`requireUidOrRedirect`/`requireRoleOrRedirect`) to redirect to `/login`
   on an invalid/expired cookie.
4. Server Actions call the non-throwing variants (`getUid`/`getCurrentUser`/
   `requireRole`) and return `{success:false, error:"unauthenticated"}`
   instead of throwing, since a client component calling an action expects a
   value back, not a redirect.

## Testing strategy

There's no end-to-end test suite. `vitest` (Phase 0 of the refactor) covers
one thing deliberately: the streak/heatmap math, because it's the highest-risk,
easiest-to-silently-break logic in the app and the one place with a real,
intentional inconsistency (see above) that a "helpful" refactor could erase
without noticing.

- `lib/actions/streak.test.ts`, `overview.test.ts`, `instructor.test.ts`,
  `lib/streak/calculate.test.ts` — characterization tests pinning each
  implementation's exact current behavior (off-by-one walk-back branches,
  longest-vs-current-streak divergence, heatmap level bucketing, pagination
  boundaries, `NaN`-vs-`0` on zero-enrollment classes, etc).
- `lib/actions/streakDivergence.test.ts` — pins the streakRules-aware vs.
  streakRules-blind divergence itself.

Everything else (auth, repositories, OpenAI services, page-level wiring) is
verified manually against the running dev server — see each Server Action's
call sites for the flows to click through. `npm run build` (which type-checks)
is the safety net for Server Action signature drift; there is no snapshot
test for response shapes.

## Decisions already made (don't re-litigate without asking)

- **Repositories are concrete Firestore modules, not an interface behind a
  swappable adapter.** They still centralize all Firestore access (a future
  backend swap touches ~10 files instead of the whole app), but callers get
  Firestore-shaped data back, and Firestore-only features (`recursiveDelete`,
  `FieldValue.serverTimestamp()`, `count()` aggregates, `Timestamp`-cursor
  pagination) are used directly rather than abstracted away. A move to a
  relational store would need real schema redesign regardless (nested
  subcollections like `streakEntries/{date}` have no direct relational
  equivalent), so interfaces now wouldn't avoid that work later.
- **The streakRules divergence is preserved, not fixed** (see above).
- **`lib/streak/calculate.ts` + `StreakSummary.tsx`/`ActivityHeatmap.tsx` stay
  unmounted**, migrated onto the shared domain module but not wired into a
  route — wiring them in is a product decision, out of scope for the
  refactor that produced this architecture.
- **Large `"use client"` components are untouched** by the backend refactor
  (`ChallengesClient.tsx`, `StudentsClient.tsx`, `SprintBoardClient.tsx`,
  `ProjectsSprintClient.tsx`, `SettingsClient.tsx`, etc.) — they call actions,
  they don't reach into repositories/domain/services directly.
