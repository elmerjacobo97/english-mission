# English Mission

Narrative English-learning game. Spanish is the interface language; English is the learning material.

## Stack

- Next.js 16.3.5 App Router
- React 19 and TypeScript
- Tailwind CSS v4
- Supabase Auth and Postgres

## Setup

1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
3. Link Supabase CLI with your project using `rtk supabase link --project-ref <project-ref>`, then apply versioned migrations with `rtk supabase db push`.
4. Add `http://localhost:3000/**` to Supabase Auth Redirect URLs.
5. Start development with `rtk pnpm dev`.

Supabase Dashboard may label the client key as a publishable key. Use its value for `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Never commit `.env.local`.

## Commands

```bash
rtk pnpm dev
rtk pnpm lint
rtk tsc --noEmit
rtk pnpm test
rtk pnpm build
```

## Auth And Progress

Auth uses magic links only. `src/proxy.ts` protects application routes and refreshes sessions. `/auth/confirm` exchanges the email callback code for a session.

The root layout reads the authenticated user and progress on the server. `ProgressProvider` hydrates the client store. Progress lives in six Supabase tables with RLS policies scoped to `auth.uid() = user_id`; no progress is stored in `localStorage`.

Mutations update the UI optimistically. `progress-sync.ts` sends absolute section payloads through a FIFO queue, retries failed writes, retries when the browser returns online, and shows `SyncBanner` when writes fail.

## Learning Paths

Choose a CEFR route from **Básico (A1–A2)**, **Intermedio (B1–B2)** or **Avanzado (C1)**. The optional nine-question diagnostic recommends a starting point; you can also choose manually or switch routes at any time without losing mission progress. Each route unlocks independently. The MVP includes all eight basic missions, a B1 interview and a C1 first-day-at-work mission; later advanced missions remain marked as planned. Guided conversation, spaced review, streaks, stars and text-to-speech are available without requiring a microphone. Route selection is stored in `progress_core.course_band`; apply the new versioned Supabase migration when deploying the app.

## Manual Verification

1. Configure Auth Redirect URLs for local and production domains. Confirm the magic-link email template points to `/auth/confirm`.
2. Open the app in Browser A. Request a magic link, sign in, complete a mission, and confirm coins, stars, streak, review cards, shop state, and Coco look changes remain after refresh.
3. Open the app in Browser B with a different account. Confirm Browser B cannot see or change Browser A progress.
4. Sign out from the account menu. Confirm protected routes return to `/login` and a signed-in `/login` request returns to `/`.
5. In DevTools, set network to Offline. Trigger a progress mutation and confirm the optimistic UI plus `No pudimos guardar tu progreso.` and `Reintentar` banner.
6. Restore network or click `Reintentar`. Confirm the banner disappears, refresh the page, and verify the mutation remains saved.
7. Switch between CEFR routes and confirm mission progress remains. Use `Reiniciar progreso`, confirm the dialog, and verify coins, missions, reviews, streak, shop, and looks reset while the chosen route remains selected.
