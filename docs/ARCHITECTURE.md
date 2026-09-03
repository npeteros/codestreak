# Architecture

CodeStreak's backend is organized into four layers underneath `app/`, each with
one job. A Server Action should read as a straight line through these layers —
auth guard, then repository call(s), then domain/service call(s), then a
response shape — with no raw database access, auth logic, or business-rule
math inlined at the action or page level.

```
app/**/page.tsx           Server Components — auth + data-fetch for the initial render
        |
lib/actions/*.ts          "use server" — orchestration only (see below)
        |
   ┌────┼──────────┬──────────────┐
   |    |          |              |
lib/auth  lib/repositories  lib/domain  lib/services
session   MySQL access via   pure math   external APIs
verification lib/db/models   (streak/    (OpenAI, email)
(typed, no    (Sequelize)    heatmap,
 shaping)                    invite codes,
                             time helpers)
```

The database is MySQL, accessed through Sequelize models in `lib/db/models/`
(schema/migrations in `lib/db/migrations/`) — this replaced an earlier
Firestore backend. Auth is likewise hand-rolled (argon2 + `jose`-signed
session JWTs), replacing an earlier Firebase Auth integration.

## Layers

### `lib/auth/session.ts`

The single source of truth for "who is making this request." Everything else
that needs identity or role calls into this module rather than touching
cookies, `jose`, or `SESSION_SECRET` directly.

Sessions are self-issued, `jose`-signed JWTs (`{uid, role}`, HS256), not a
third-party auth provider — `issueSessionCookie()` mints one at sign-up/log-in
time. Passwords are hashed with `argon2` (argon2id), only ever in
`lib/actions/auth.ts`'s Node-runtime Server Actions, never in `proxy.ts`.

| Function | Cost | Use when |
|---|---|---|
| `getUid()` | local JWT verify only | you only need the caller's uid (no role check) |
| `getCurrentUser()` | local JWT verify + `users` table read | you need role/name/email |
| `requireRole(role)` | same as above | Server Action should return `{success:false}` on failure |
| `requireUidOrRedirect()` / `requireRoleOrRedirect(role)` | throwing variants | layouts and pages that redirect to `/login` instead of returning an error value |

`proxy.ts` (Next 16's renamed Middleware) is the one exception: it decodes
`role` straight off the verified JWT payload instead of calling
`requireRole()`, deliberately, to avoid a database round-trip on every
navigation. It still shares `verifySessionToken()` with everything else.

**Rule:** no file outside `lib/auth/session.ts` should sign, verify, set, or
read the `codestreak_session` cookie, or read `SESSION_SECRET`.

### `lib/repositories/*.ts`

One module per aggregate (`users`, `courses`, `enrollments`, `challenges`,
`submissions`, `checkins`, `sprintCards`, `journal`, `streakEntries`,
`projects`) backed by Sequelize models in `lib/db/models/`. Each returns
typed, un-shaped row data — `{ id, data }` pairs, not a caller-specific
response. Response shaping (renaming fields, computing derived values,
picking a subset) stays in the action layer, since the same aggregate is
often shaped differently by different callers (e.g. a submission looks
different in `getStudentDetail`'s drawer vs.
`getStudentSubmissionHistory`'s paginated list).

There is no `studentHub` repository — a student's enrolled courses are a
direct join against `Enrollment`+`Course` (`enrollments.ts`'s
`listEnrolledCourses`/`getFirstEnrolledCourse`) rather than a denormalized
snapshot, since a relational `JOIN` is exactly what that snapshot existed to
avoid under Firestore.

**Rule:** no file outside `lib/repositories/` should import from `lib/db/`
or construct a Sequelize query directly.

Cascading deletes (`courses.ts::deleteCourseCascade`,
`enrollments.ts::unenrollStudent`) use real hard `DELETE`s with `ON DELETE
CASCADE` foreign keys, wrapped in a transaction — a deliberate exception to
this org's usual soft-delete convention, made explicitly for this app to
match its pre-existing behavior (nothing here is recoverable after deletion;
don't add soft-delete flags to these tables without asking first). The
`users` table is the one exception in the other direction: it has a
`deleted` flag, since that's what auth's session check uses to invalidate a
disabled account's session — see `lib/auth/session.ts`.

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

- **Legacy per-course `sprint_cards` table** — one row per (student, course,
  card), a flat `TODO`/`IN_PROGRESS`/`DONE` Kanban snapshot. It's **read-only
  from the app** (`lib/repositories/sprintCards.ts::listSprintCards`) — only
  `scripts/seed.ts` writes to it. It feeds the sprint-progress counts shown
  on the student overview and instructor roster/drawer.
- **Per-project `sprint_tasks` table** — the live, editable Kanban
  (`TODO`/`IN_PROGRESS`/`IN_REVIEW`/`DONE`) behind `lib/actions/projects.ts`
  and `components/sprint/SprintBoardClient.tsx`, scoped by `(projectId,
  studentId)`. Each student has their own board within a shared project
  (`projects` table, with a `project_student_access` join table replacing
  what was a Firestore array field for `scope:"STUDENTS"` projects);
  instructors pick a student to view/manage via a board switcher
  (`app/(instructor)/_components/ProjectsSprintClient.tsx`). `order` is a
  `DECIMAL(20,10)` column (fractional-index drag-reorder) — never change it
  to a float/double type, repeated insert-between operations will eventually
  collide on precision.

These are unrelated data models that happen to both be called "sprint" —
don't assume a change to one applies to the other.

## Auth flow

1. `signUp`/`logIn` (`lib/actions/auth.ts`, real Server Actions — `logIn` is
   no longer a stub) hash/verify the password with `argon2` and, on success,
   call `issueSessionCookie(uid, role)` directly. No client-SDK round trip,
   no separate session-exchange route — the Server Action sets the cookie
   itself.
2. `proxy.ts` runs on every `/dashboard/*` request, decodes the session
   JWT's `role` claim locally via `verifySessionToken()` (no DB read) and
   redirects instructor↔student cross-navigation.
3. Layouts/pages call `lib/auth/session.ts`'s throwing variants
   (`requireUidOrRedirect`/`requireRoleOrRedirect`) to redirect to `/login`
   on an invalid/expired cookie.
4. Server Actions call the non-throwing variants (`getUid`/`getCurrentUser`/
   `requireRole`) and return `{success:false, error:"unauthenticated"}`
   instead of throwing, since a client component calling an action expects a
   value back, not a redirect. `getCurrentUser()` re-reads the `users` table
   (excluding soft-deleted accounts) as the authoritative check.

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

- **Repositories are concrete Sequelize modules, not an interface behind a
  swappable adapter.** They centralize all database access (a future backend
  swap touches ~12 files instead of the whole app), but callers get
  MySQL-shaped data back rather than something abstracted behind a generic
  interface. This app was previously on Firestore; that migration is what
  produced the current schema (see the per-aggregate design notes in each
  `lib/repositories/*.ts` file for what changed shape in the process —
  `studentIds` array → `project_student_access` join table,
  `streakEntries.sources` map → four boolean columns, the eliminated
  `studentHub` denormalization, etc.).
- **The streakRules divergence is preserved, not fixed** (see above).
- **`lib/streak/calculate.ts` + `StreakSummary.tsx`/`ActivityHeatmap.tsx` stay
  unmounted**, migrated onto the shared domain module but not wired into a
  route — wiring them in is a product decision, out of scope for the
  refactor that produced this architecture.
- **Large `"use client"` components are untouched** by the backend refactor
  (`ChallengesClient.tsx`, `StudentsClient.tsx`, `SprintBoardClient.tsx`,
  `ProjectsSprintClient.tsx`, `SettingsClient.tsx`, etc.) — they call actions,
  they don't reach into repositories/domain/services directly.
