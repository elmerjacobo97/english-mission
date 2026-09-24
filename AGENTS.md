<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# English Mission

Narrative English-learning game. Spanish is UI, narration, and comments; English is learning material. Keep that Spanish neutral for Latin America: `curriculum.test.ts` scans non-test `src/**/*.ts(x)` for Spain regionalisms.

## Commands

- Use `pnpm@11.21.0` through `rtk` for repo commands.
- Setup: copy `.env.example` to `.env.local`, set both required Supabase variables, then run `rtk pnpm dev`.
- Before finishing, run `rtk pnpm lint && rtk tsc --noEmit && rtk pnpm test`; build with `rtk pnpm build`.
- Focus tests with `rtk pnpm test path/to/file.test.tsx`. `rtk vitest run <file>` hides stdout and writes `.vitest/json/output.json`.
- If `.next/types` is missing, run `rtk pnpm dev` or `rtk pnpm build` before typecheck; Next generates route types and ignored `next-env.d.ts`.

## Runtime

- Required variables: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Keep secrets in `.env.local`; `.env*` is ignored except `.env.example`.
- Optional `AI_*` and `TRANSCRIPT_*` variables are in `.env.example`. Provider keys are server-only; never expose `AI_API_KEY` or `TRANSCRIPT_API_KEY` with `NEXT_PUBLIC_`.
- Supabase CLI targets linked remote project; local Supabase and Docker are not required. Verify project link before remote operations, and run `rtk supabase link --project-ref <project-ref>` if missing. `supabase/migrations/` is database source of truth; apply with `rtk supabase db push` only when requested. Do not create a competing `schema.sql`.
- Auth is magic-link only. `src/proxy.ts` refreshes sessions and protects pages; `/auth/confirm` exchanges callback codes. The matcher skips `/api` and `/auth`, so route handlers authenticate themselves. Configure Supabase Auth redirect URLs for local and deployed hosts.

## Structure

- Dependency direction: `src/app` composes `src/features/*`; features use `src/shared/*`; shared code imports no features and features do not import each other.
- `(app)` routes use `AppShell`. Use global Next route types (`PageProps<'/mission/[slug]'>`, `LayoutProps<'/'>`) and shared `PageHeader` for new pages.
- Mark server-only modules with `import "server-only"`; client components must not import server gateways, repositories, or config. AI gateway: `src/shared/lib/ai/gateway.server.ts`; shared daily AI quota used by tutor and rehearsals: `src/shared/lib/ai/ai-usage.server.ts`; video provider/repository: `src/features/videos/server/`.
- Progress is version 8 and Supabase-backed, not `localStorage`. Root layout reads it server-side; `ProgressProvider` hydrates the store. Mutations are optimistic and sync absolute payloads through a FIFO queue with retry and `online` recovery.
- The first `streak_state` upsert omits `freezes` and `pending_freezes_used`, so opening the app works before that migration. Activity writes include both columns and fail until `rtk supabase db push`. Buying a freeze does not count as the day's activity. `/progress` stays out of the nav: the header streak chip links there and shows only the day count.
- Rehearsals persist in `rehearsal_sessions`. Finishing one leaves coins, streak, and mission progress unchanged.
- CEFR bands (Basic A1–A2, Intermediate B1–B2, Advanced C1) differ from numeric challenge levels. Placement recommends; learner chooses. `courseBand` may be null until selection. Band changes preserve missions; reset preserves selected band.

## Content And Specs

- Curriculum lives in `src/shared/lib/curriculum/`: `plan.json` defines order and vocab; `missions/` holds written beats; `mission-catalog.ts` joins them. New missions need all three plus `written: true`.
- Draft beats from `src/shared/lib/curriculum/draft-mission-prompt.md`. Leave the draft out of `missions/` and keep `written: false` until a person reviews it and `curriculum.test.ts` passes. The AI gateway stays for tutor and rehearsal replies.
- Read `src/shared/lib/curriculum/curriculum.test.ts` before content edits. It enforces vocab/count limits, allowed challenge kinds, English vocab grounding and recycling, grammar notes, cast roles, and neutral Spanish.
- Read the matching `specs/NN-slug.md` before changing specified behavior. `specs/.spec-config.yml` auto-creates `spec-NN-slug` branches.
- For auth or progress changes, follow `README.md` → Manual Verification, including two-account isolation and offline sync retry.

## Tests

- Vitest uses jsdom and Testing Library; tests are colocated as `*.test.ts(x)`. `src/test/setup.ts` cleans the DOM and resets progress; fixtures live in `src/test/fixtures.ts`.
- Run tests from repo root: curriculum validation reads `src/` from `process.cwd()`.
- Challenge submit control sits outside its form and targets `form="challenge-form"`; use `src/test/submit-challenge.ts` in challenge tests.

`CLAUDE.md` delegates to this file; keep repository guidance in `AGENTS.md`.
