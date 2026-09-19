<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# English Mission

Narrative English-learning game. Next.js 16.3.5 App Router + React 19 + Tailwind v4 + TypeScript. Supabase Auth + Postgres store progress; runtime needs public Supabase environment variables.

## Commands

Package manager is pnpm; the README's npm/yarn/bun instructions are stale boilerplate. The user runs everything through `rtk` (CLI output proxy that compresses command output), so keep the `rtk` prefix when running and reporting commands.

- `rtk pnpm dev` / `rtk pnpm build` / `rtk pnpm test` / `rtk pnpm lint`
- Single test file: `rtk pnpm test src/shared/components/game/choice-challenge.test.tsx`
- Typecheck has no script: `rtk tsc --noEmit` (equivalent to `pnpm exec tsc --noEmit`). Run `rtk pnpm dev` or `rtk pnpm build` at least once so `next-env.d.ts` can resolve the generated `.next/types/*` typed-route files.
- Verify before finishing: `rtk pnpm lint && rtk tsc --noEmit && rtk pnpm test`.
- `rtk vitest run <file>` also works but hides stdout; read results from the JSON report it writes to `.vitest/json/output.json`.

## Supabase

- Required variables: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Keep values in `.env.local`; never commit secrets.
- Apply `supabase/schema.sql` in Supabase SQL Editor. It defines six progress tables with RLS and `auth.uid() = user_id` policies. No versioned migrations in this spec.
- Auth uses Supabase magic links only. `src/proxy.ts` refreshes sessions and protects app routes; `src/app/auth/confirm/route.ts` exchanges callback codes.
- Root layout reads the authenticated user and `readProgress(userId)` on the server. `ProgressProvider` hydrates `progress-store` before app UI renders.
- Mutations update the store optimistically. `progress-sync.ts` writes absolute section payloads through a FIFO queue, retries failed writes, retries on `online`, and renders `SyncBanner` on errors.

## Specs

Feature work is planned in `specs/NN-slug.md` (spec-driven flow, config in `specs/.spec-config.yml`). `/spec-impl` creates the branch `spec-NN-slug` automatically. Specs 01 (spaced repetition), 02 (daily streak), 03 (coin shop), 04 (looks de Coco), 05 (notebook practice) and 06 (Supabase progress) are implemented — read the one you touch before changing its behavior. Closing is local-only: `/spec-close` commits and merges on `main`; `main` is ahead of `origin/main` and is never pushed.

## Content invariants

Curriculum lives in `src/shared/lib/curriculum/`: `plan.ts` holds 12 mission entries (only 4 are `written: true`); beats live in `missions/mission-XX-*.ts`; `mission-catalog.ts` joins them by slug (`beatsBySlug`). Adding a mission means: plan entry, beats file, `beatsBySlug` entry, `written: true`.

`src/shared/lib/curriculum/curriculum.test.ts` enforces hard rules on every content edit — read it before writing mission material. Summary: 6–12 vocab words per mission; 8–16 beats with ≥3 challenges; challenge kinds must be allowed by that level's profile in `src/shared/lib/game/utils/difficulty.ts`; every declared vocab word must appear in the mission's English material (zero orphans); ≥3 words recycled from earlier missions; ≥2 grammar notes with body 20–280 chars; beat characters must be in the mission's `cast`.

The same test suite scans all of `src/` for Spain regionalisms (`SPAINISMS` in `src/shared/lib/curriculum/curriculum.ts`), skipping `curriculum.ts` itself and test files. Keep every string — content, UI copy, comments — in neutral Latin American Spanish. Spanish is the UI/narration language; English is the learning material.

## Architecture

- `src/app` — thin routes only. The `(app)` route group wraps `/` map, `/notebook`, `/review` and `/shop` in `AppShell`; `/mision/[slug]` renders its own player chrome outside the shell. Route pages use Next 16 global types (`PageProps<'/mision/[slug]'>`, `LayoutProps<'/'>`), not imported prop types.
- Structure: `src/app` (routes) → `src/features/*` (domain slices) → `src/shared/{components,hooks,lib}` (reusable code). Dependency direction `app -> features -> shared`; `src/features/*` never import each other and `src/shared/*` never imports features. Each feature slice keeps `components/` and `hooks/` (shop adds `utils/`); put new slice code there.
- Boundaries: shared game code lives in `src/shared/`: `lib/game` (`types/`, `utils/` with `difficulty`/`rewards`/`answer-check`, `content/` with `characters`/`coco-looks`), `lib/curriculum` (plan, catalog, missions, validation utils), `lib/review` (spaced repetition: `schedule`, `review-queue`, `review-exercise`), `hooks/` (`use-challenge-run`, `use-due-reviews`, `use-progress`), `components/game` (challenge UI) and `components/page-header.tsx`.
- `src/features/shell` — `app-shell.tsx` (desktop sidebar / mobile bottom bar, coins + streak header). Reuse `PageHeader` from `src/shared/components/page-header.tsx` for any new page so titles and descriptions stay homologated.
- `src/features/mission` — mission-facing UI in `components/`: `mission-map.tsx`, `mission-player.tsx`, `mission-complete.tsx`, `mission-stamp.tsx`, `notebook.tsx` (inline solo challenge via `notebook-practice.tsx`); hook in `hooks/use-mission-run.ts`. Beats are `story` or one of six challenge kinds (`choice`, `order`, `type`, `fill`, `listen`, `dialogue`); `mission-player.tsx` builds the shared challenge props and renders one component per `beat.kind` from `src/shared/components/game`. The submit button lives outside the form and targets `form="challenge-form"` (tests submit via `src/test/submit-challenge.ts`). Coin/star math is pure in `src/shared/lib/game/utils/rewards.ts`; per-level rules (allowed kinds, hints, narration style) in `src/shared/lib/game/utils/difficulty.ts`.
- `src/shared/lib/progress` — module-level v6 store hydrated from server data and synced to Supabase; no localStorage. Shape `{ coins, missions, reviews, streak, shop, looks }`; pure rules in `streak.ts`, `shop.ts` and `looks.ts` (looks de Coco: `isOwned`, `canBuy`, `nextLooks`, `LOOK_PRICES`). `progress-mappers.ts` maps six database rows; `progress-repository.server.ts` reads and initializes progress; `progress-sync.ts` owns FIFO writes and retry state. Consumed through `useSyncExternalStore` (`src/shared/hooks/use-progress.ts`), with stable server snapshots for hydration safety.
- `src/features/review` — Leitner spaced repetition behind `/review`: 1/3/7-day boxes, cards keyed by the lowercase trimmed English word, only completed-mission vocab enters the pool, due queue capped at 10 (`components/review-session.tsx`, `components/review-summary.tsx`, `hooks/use-review-run.ts`). `src/shared/lib/review/` is pure logic; components reuse `ChoiceChallenge`/`TypeChallenge`/`ListenChallenge` from `src/shared/components/game` with `rewardsEnabled: false` and free hints that still count as failures.
- `src/features/shop` — recharge mini-quiz behind `/shop` (`components/shop-session.tsx`, `hooks/use-shop-run.ts`, `utils/shop-exercise.ts`): max 3 paid recharges per local day (`src/shared/lib/progress/shop.ts`), level-1 profile payout through `coinsForAttempt`. Below it, the always-visible Coco look catalog (`src/shared/lib/game/content/coco-looks.ts`); buying equips via `selectLook`.
- `src/shared/lib/speech.ts` — browser SpeechSynthesis only; playback is user-triggered (🔊 buttons), no autoplay and no audio files.
- `src/shared/lib/app-version.ts` — `APP_VERSION` string shown in `AppShell`; bump together with `package.json` on releases.
- Styling: Tailwind v4 tokens declared in `src/app/globals.css` `@theme` (`bg-surface`, `text-ink`, `shadow-card`, `font-display`). Fonts via `next/font` (Fredoka display, Nunito body). Phosphor icons for chrome; emoji stay in narrative content.

## Testing

Vitest + jsdom + Testing Library; test files sit next to the code as `*.test.ts(x)`. `src/test/setup.ts` resets the DOM and progress store after every test, so tests start clean. Shared fixtures in `src/test/fixtures.ts`. `curriculum.test.ts` reads files from disk via `process.cwd()`, so run tests from the repo root.
