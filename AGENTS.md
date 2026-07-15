<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Backend architecture

The backend is layered: `lib/auth/` (session/role checks) → `lib/repositories/`
(all Firestore access) → `lib/domain/` (pure streak/heatmap/time/invite-code
math) → `lib/services/openai/` (external API calls) → `lib/actions/*.ts`
("use server" files, orchestration only) → `app/**/page.tsx`. Read
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) before making non-trivial
backend changes — it documents the layer boundaries, the intentional
streakRules-aware-vs-blind divergence in the streak/heatmap math (do not
"fix" it as a side effect of something else), and the two unrelated
"sprint" data models.

Rules an agent should not violate without a deliberate, explicit reason:

- No `adminDb`/Firestore path construction outside `lib/repositories/`.
- No cookie/session-cookie verification outside `lib/auth/session.ts`.
- No `openai` package usage or `OPENAI_API_KEY` read outside `lib/services/openai/`.
- No business-rule math (streak/heatmap calculations) inlined in an action or page — it belongs in `lib/domain/streak.ts`.
- `lib/actions/*.ts` exports must stay auth-guard → repository → domain/service → response-shape; if a change makes an action file grow raw logic again, extract it back to the appropriate layer instead.

Streak/heatmap logic has characterization tests (`vitest`) pinning exact
current behavior, including the deliberate rules divergence — run
`npm run test` after touching `lib/domain/streak.ts`, `lib/actions/streak.ts`,
`lib/actions/overview.ts`, `lib/actions/instructor.ts`, or
`lib/streak/calculate.ts`, and treat a failing test as a signal to fix the
change, not the test.
