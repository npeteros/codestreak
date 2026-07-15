# Performance optimizations

This documents a production-readiness pass done against the app as it stood
at commit `d56b227`, aimed at the app's ability to handle heavy traffic
reliably. It was a **behavior-preserving perf pass** — business logic and
response shapes are unchanged; every commit was verified with `npm run test`
and `npm run build` before landing. Nine changes landed, in priority order
(highest impact-to-effort first); a few findings from the same audit were
deliberately **not** turned into code changes and are called out at the end.

## 1. Instructor roster/overview N+1 Firestore reads

**Commit:** `acfbe7b`
**Files:** `lib/actions/instructor.ts`, `lib/repositories/users.ts`,
`lib/repositories/submissions.ts`, `lib/repositories/checkins.ts`

`getRoster` and `getClassOverview` each looped over every enrolled student
and fired 2-4 Firestore reads per student — including two full-collection
fetches (`submissionsCol(...).get()`, `checkInsCol(...).get()`) used only to
read `.size`. For a 500-student class, the roster page alone was issuing
2,000+ document reads on a single load, scaling linearly with class size.

- Added `getUsers(uids: string[])` to `lib/repositories/users.ts`, a single
  `adminDb.getAll(...)` batched read, replacing one `getUser(sid)` call per
  student in both loops.
- Swapped `countSubmissionsFull` and `countCheckInsSince`'s full-collection
  `.get()` for `.count().get()` (the aggregate-count pattern the sibling
  `countSubmissions` function already used correctly).

## 2. Missing parallelization in streak/instructor actions

**Commit:** `470f7cb`
**Files:** `lib/actions/streak.ts`, `lib/actions/instructor.ts`

`getStreakData` and `verifyStudentAccess` (the auth gate behind every
per-student instructor action — detail drawer, submission history,
check-in history) each awaited two independent Firestore reads
sequentially. Wrapped both pairs in `Promise.all`, removing one avoidable
round trip from the student dashboard load and from every per-student
instructor action.

## 3. Unbounded streakEntries query

**Commit:** `42a5fe7`
**File:** `lib/repositories/streakEntries.ts`

`listStreakEntriesAsc` fetched a student's entire `streakEntries`
subcollection with no `.limit()`, growing unbounded for long-tenured
accounts. It couldn't take a tight window like the roster's 365-day cap,
though — `getLongestStreak` (`lib/domain/streak.ts`) needs full history,
since an all-time-longest streak can predate any realistic recent window.
Added a defensive `SAFETY_CAP_DAYS = 3650` (10 years) instead: a ceiling
against pathological data that doesn't affect any real bootcamp-length
account, not a real windowing strategy (past the cap, ascending order means
it would start truncating recent days before old ones).

## 4. Root marketing page forced dynamic rendering

**Commit:** `2bcf565`
**Files:** `app/page.tsx`, `proxy.ts`

`app/page.tsx` called `getCurrentUser()` (cookie verify + a Firestore
`users/{uid}` read) on every hit, purely to redirect already-logged-in
visitors — forcing dynamic rendering on the app's highest-traffic route.
`proxy.ts` already decodes the JWT `role` claim on every request with no
Firestore round trip, so the redirect now happens there instead, gated on
`pathname === "/"` and only when a session cookie is present (anonymous
visitors fall through untouched). `app/page.tsx` now has no runtime
dependency and prerenders statically — confirmed by `next build`'s route
summary flipping `/` from `ƒ` (dynamic) to `○` (static).

## 5. Eagerly-bundled markdown pipeline

**Commit:** `853d74c`
**Files:** `components/ui/Markdown.tsx` (new), and 6 client components:
`StudentsClient.tsx`, `StudentOverviewClient.tsx`, `ProjectsSprintClient.tsx`,
`SprintBoardClient.tsx`, `ProjectDescriptionPanel.tsx`, `ChallengeClient.tsx`

`react-markdown` + `remark-gfm` were statically imported in these client
components, shipping the markdown parser in the initial JS bundle of every
dashboard page load — even where the markdown only renders behind a click
(a drawer, a modal, a preview toggle). Extracted a shared `Markdown`
wrapper and load it via `next/dynamic` in each consumer, so the pipeline
loads only when that part of the tree actually renders.

`app/(student)/dashboard/student/journal/page.tsx` also uses
`react-markdown` but was deliberately left untouched: it's a **Server
Component** (no `"use client"`), so `react-markdown` already executes
server-side there with zero client-bundle cost — dynamic-importing it
would have added complexity for no benefit.

## 6. Client-side fetch waterfalls on sprint boards

**Commit:** `0c8b03f`
**Files:** `app/(student)/dashboard/student/sprint/{page,SprintClient}.tsx`,
`app/(instructor)/dashboard/instructor/[courseId]/sprint/page.tsx`,
`app/(instructor)/_components/ProjectsSprintClient.tsx`

Both sprint board views fetched the initially-selected project's tasks in
a mount `useEffect`, so every visit painted blank/skeleton before the
client round trip resolved. The parent `page.tsx` in each case now
replicates the client's default-selection logic (default project, and for
the instructor board, the default board member) and prefetches that same
`getSprintTasks` call server-side, passing the result down as
`initialTasks`. The mount effect is skipped once via a `isInitialMount` ref
since that data already matches; switching projects/students after mount
still fetches client-side, since that's genuinely triggered by
post-mount interaction and can't be precomputed.

## 7. Oversized client component for one button

**Commit:** `e8ad283`
**Files:** `app/(instructor)/_components/InstructorOverview.tsx` (renamed
from `InstructorOverviewClient.tsx`, now a Server Component),
`app/(instructor)/_components/AtRiskSection.tsx` (new client island)

The entire 217-line course-overview page (stats grid, heatmap, at-risk
list) was `"use client"` for the sake of one Nudge button and a toast.
Split into `InstructorOverview` (Server Component — header, stats grid,
heatmap, all pure display of server-fetched data) and `AtRiskSection` (the
client island holding the nudge/toast state and the at-risk list
rendering), so only the interactive slice ships as client JS/hydration
cost.

## 8. Duplicated toast-timer pattern with no cleanup

**Commit:** `ab54075`
**Files:** `lib/hooks/useToast.ts` (new), and 6 call sites: `AtRiskSection.tsx`,
`ChallengesClient.tsx`, `CoursesHomeClient.tsx`, `SettingsClient.tsx`,
`StudentsClient.tsx`, `PublicCoursesClient.tsx`

The same `useState` + bare `setTimeout(() => setToast(null), ~2200)`
pattern was copy-pasted across 6 client components with no cleanup — a
component unmounting (e.g. fast navigation) within the toast's lifetime
still called `setState` on it. Extracted `useToast()`, which tracks its
pending timeout in a ref, clears it on unmount, and clears/resets it on
re-trigger (so firing a second toast before the first dismisses doesn't
let the stale timer clear the new message early).

## 9. Blanket session-revocation checking

**Commit:** `e4d2999`
**File:** `lib/auth/session.ts`

`verifySessionCookie` always passed `checkRevoked=true` to
`adminAuth.verifySessionCookie`, forcing a network round trip to Google's
Identity Toolkit — on top of local JWT verification — on every
`/dashboard/*` navigation (`proxy.ts`) and nearly every Server Action (via
`getUid()`). `checkRevoked` now defaults to `false`; the high-frequency,
low-stakes paths (`proxy.ts`, `getUid()`) accept the default, while
`getCurrentUser()` — the role gate behind every instructor-privileged
Server Action and redirect-guarded page — explicitly opts into
`checkRevoked=true`, since that's the place an actually-revoked session
matters most.

This is a deliberate security/latency tradeoff, decided with the user
rather than assumed: it accepts a short window where a just-revoked
session could still be used for non-privileged reads (e.g. viewing one's
own dashboard) in exchange for removing a per-request external API call
from the hot path.

## Deliberately not fixed here (flagged as infra recommendations)

- **No rate limiting anywhere**, including on OpenAI-calling actions
  (`submitChallenge`, `generateAiChallenges`) that cost real money per
  call. A durable fix needs a shared store (e.g. Upstash Redis) since
  in-memory counters don't survive across serverless instances — per
  `AGENTS.md`, new dependencies need explicit approval, so this stays a
  Step 5 recommendation rather than a code change. This is the first thing
  likely to hurt at ~10x current load (cost, not availability).
- **Read-side fan-out for very large rosters**: if class sizes grow past a
  few hundred, the batched reads from fix #1 still scale O(class size) per
  view. Past that point, consider write-time denormalization (a Cloud
  Function maintaining per-course aggregate counters) instead of
  fan-out-on-read.
- **CDN/static caching** for the now-static marketing route (fix #4) —
  an infra-layer follow-up, not a code change.
- **Firestore usage/billing alerts** as traffic scales, since several
  endpoints (roster, class overview) still scale reads with class size
  even after batching.

## Verification

No end-to-end suite exists for this app (see `docs/ARCHITECTURE.md`'s
testing strategy) — `npm run test` covers the streak/heatmap
characterization tests (unaffected by this pass, since business logic
didn't change) and `npm run build` type-checks every Server Action
signature and confirms static/dynamic route classification. Everything
else was verified manually against the dev server per commit. See the
session's test-case list for the full manual regression checklist covering
all nine changes above (roster counts, cross-role redirects, markdown
rendering, sprint board initial-load behavior, toast timing, and session
revocation behavior).
