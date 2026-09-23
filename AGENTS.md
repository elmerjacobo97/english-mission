<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# English Mission

Narrative English-learning game. Spanish is UI and narration; English is learning material. Stack: Next.js 16.3.5 App Router, React 19, Tailwind CSS 4, TypeScript, Supabase.

## Commands

- Use `pnpm@11.21.0`; README npm/yarn/bun snippets are stale. Run repo commands through `rtk`.
- Setup: copy `.env.example` to `.env.local`, fill required values, then run `rtk pnpm dev`.
- Main checks: `rtk pnpm lint`, `rtk tsc --noEmit`, `rtk pnpm test`, `rtk pnpm build`.
- Focused test: `rtk pnpm test path/to/file.test.tsx`. `rtk vitest run <file>` hides stdout and writes `.vitest/json/output.json`.
- Run `rtk pnpm dev` or `rtk pnpm build` once before typecheck when `.next/types` is missing; Next generates typed-route files and ignored `next-env.d.ts`.
- Before finishing: `rtk pnpm lint && rtk tsc --noEmit && rtk pnpm test`.

## Runtime

- Required Supabase variables: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Keep secrets in `.env.local`; `.env*` is ignored except `.env.example`.
- Optional provider variables are listed in `.env.example`: `AI_*` for the server-only OpenRouter gateway and `TRANSCRIPT_*` for the server-only Supadata provider. Keep `AI_API_KEY` and `TRANSCRIPT_API_KEY` out of client code and never use `NEXT_PUBLIC_` prefixes. Transcript mode is `native`.
- Versioned files in `supabase/migrations/` are database source of truth; link a project, then apply with `rtk supabase db push`. Do not create a competing `schema.sql`.
- Auth is magic-link only. `src/proxy.ts` refreshes sessions and protects pages; `src/app/auth/confirm/route.ts` exchanges callback codes. Configure Supabase Auth redirect URLs for local and deployed hosts.

## Structure

- Dependency direction: `src/app` routes compose `src/features/*`; features use `src/shared/*`; shared code must not import features and features must not import each other. Current feature slices: `auth`, `mission`, `review`, `shell`, `shop`, `videos`.
- `(app)` routes are wrapped by `AppShell`. Use global Next route types such as `PageProps<'/mission/[slug]'>` and `LayoutProps<'/'>`; do not define imported page-prop types. Use `PageHeader` for new pages.
- Put server-only work in files marked with `import "server-only"`; client components must not import server gateways, repositories, or config. AI gateway: `src/shared/lib/ai/gateway.server.ts`. Video provider/repository: `src/features/videos/server/`.
- Progress is module state, version 7: `{ courseBand, coins, missions, reviews, streak, shop, looks }`. `courseBand` is nullable for existing accounts until the learner chooses a route. Root layout reads progress on the server; `ProgressProvider` hydrates the store. Mutations are optimistic and sync absolute section payloads through a FIFO queue with retry and `online` recovery. Do not add progress to `localStorage`.
- CEFR course bands are separate from the five numeric challenge difficulty profiles: Basic A1–A2, Intermediate B1–B2 and Advanced C1. The optional placement quiz recommends a starting band but stores only the learner's selection. Changing bands never erases mission progress; resetting game progress keeps the selected band.

## Content And Specs

- Curriculum source: `src/shared/lib/curriculum/`. `plan.json` has 12 ordered entries; written beats live in `missions/` and are joined by `mission-catalog.ts`. Adding a mission requires the plan entry, beats JSON, catalog entry, and `written: true`.
- Read `src/shared/lib/curriculum/curriculum.test.ts` before content edits. It enforces 6-12 vocab words, 8-16 beats, at least 3 challenges, level-allowed challenge kinds, zero orphan vocab, each story vocab term inside that beat's English line, at least 3 recycled words after mission 1, at least 2 grammar notes with 21-280 character bodies, and one Coco tutor plus one or two other cast members (`character`, `function`, `objective`).
- That test also scans non-test `src/**/*.ts(x)` for Spain regionalisms. Keep UI, narration, comments, and curriculum Spanish neutral for Latin America.
- Feature behavior belongs in `specs/NN-slug.md`; read the relevant spec first. `specs/.spec-config.yml` enables automatic `spec-NN-slug` branches. `/spec-close` is local-only: merge on `main`, never push.

## Tests

- Vitest uses jsdom and Testing Library. Tests are colocated as `*.test.ts(x)`. `src/test/setup.ts` cleans the DOM and resets progress after every test; shared fixtures live in `src/test/fixtures.ts`.
- Challenge submit control is outside its form and targets `form="challenge-form"`; use `src/test/submit-challenge.ts` in challenge tests.
- Run tests from repository root because curriculum validation reads `src/` from `process.cwd()`.

`CLAUDE.md` delegates to this file; keep repository guidance in `AGENTS.md`.
