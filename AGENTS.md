<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# English Mission

Narrative English-learning game. Next.js 16.3.5 App Router + React 19 + Tailwind v4 + TypeScript. Fully client-side: progress in localStorage, no backend, no env vars, no CI.

## Commands

Package manager is pnpm; the README's npm/yarn/bun instructions are stale boilerplate. The user runs everything through `rtk` (CLI output proxy that compresses command output), so keep the `rtk` prefix when running and reporting commands.

- `rtk pnpm dev` / `rtk pnpm build` / `rtk pnpm test` / `rtk pnpm lint`
- Single test file: `rtk pnpm test src/features/mission/components/choice-challenge.test.tsx`
- Typecheck has no script: `rtk tsc --noEmit` (equivalent to `pnpm exec tsc --noEmit`). Run `rtk pnpm dev` or `rtk pnpm build` at least once so `next-env.d.ts` can resolve the generated `.next/types/*` typed-route files.
- Verify before finishing: `rtk pnpm lint && rtk tsc --noEmit && rtk pnpm test`.
- `rtk vitest run <file>` also works but hides stdout; read results from the JSON report it writes to `.vitest/json/output.json`.

## Specs

Feature work is planned in `specs/NN-slug.md` (spec-driven flow, config in `specs/.spec-config.yml`). `/spec-impl` creates the branch `spec-NN-slug` automatically. `specs/01-spaced-repetition.md` is implemented — read it before changing review behavior.

## Content invariants

Curriculum lives in `src/features/mission/content/`: `plan.ts` holds 12 mission entries (only 4 are `written: true`); beats live in `missions/mission-XX-*.ts`; `mission-catalog.ts` joins them by slug (`beatsBySlug`). Adding a mission means: plan entry, beats file, `beatsBySlug` entry, `written: true`.

`content/curriculum.test.ts` enforces hard rules on every content edit — read it before writing mission material. Summary: 6–12 vocab words per mission; 8–16 beats with ≥3 challenges; challenge kinds must be allowed by that level's profile in `utils/difficulty.ts`; every declared vocab word must appear in the mission's English material (zero orphans); ≥3 words recycled from earlier missions; ≥2 grammar notes with body 20–280 chars; beat characters must be in the mission's `cast`.

The same test suite scans all of `src/` for Spain regionalisms (`SPAINISMS` in `utils/curriculum.ts`). Keep every string — content, UI copy, comments — in neutral Latin American Spanish. Spanish is the UI/narration language; English is the learning material.

## Architecture

- `src/app` — thin routes only: `/` map, `/mision/[slug]` player, `/cuaderno` notebook, `/review` spaced-repetition session. Route pages use Next 16 global types (`PageProps<'/mision/[slug]'>`, `LayoutProps<'/'>`), not imported prop types.
- `src/features/mission` — all game code: `types/`, `content/`, `utils/`, `hooks/`, `components/`. `mission-player.tsx` builds the shared challenge props and renders one component per `beat.kind`; the submit button lives outside the form and targets `form="challenge-form"` (tests submit via `src/test/submit-challenge.ts`).
- `src/lib/progress` — module-level store persisted to `english-mission:progress:v3` (migrates v2 and v1). Consumed through `useSyncExternalStore` (`use-progress.ts`), never effect+setState: eslint-config-next 16 enables `react-hooks/set-state-in-effect`. Server snapshot is `emptyProgress` for hydration safety. Reuse the same pattern for any other client-only snapshot (e.g. `src/features/review/hooks/use-review-run.ts`).
- `src/features/review` — Leitner spaced repetition behind `/review`. `utils/` is pure logic (queue, generated exercises, 1/3/7-day schedule, cards keyed by lowercase English word); components reuse `ChoiceChallenge`/`TypeChallenge`/`ListenChallenge` with `rewardsEnabled: false` and free hints that still count as failures.
- `src/lib/speech.ts` — browser SpeechSynthesis only; playback is user-triggered (🔊 buttons), no autoplay and no audio files.
- Styling: Tailwind v4 tokens declared in `src/app/globals.css` `@theme` (`bg-surface`, `text-ink`, `shadow-card`, `font-display`). Fonts via `next/font` (Fredoka display, Nunito body). Phosphor icons for chrome; emoji stay in narrative content.

## Testing

Vitest + jsdom + Testing Library; test files sit next to the code as `*.test.ts(x)`. `src/test/setup.ts` resets the DOM, progress store, and localStorage after every test, so tests start clean. Shared fixtures in `src/test/fixtures.ts`.
