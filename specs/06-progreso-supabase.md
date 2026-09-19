# SPEC 06 — Progreso en Supabase con cuentas

> **Estado:** Implementado
> **Depende de:** 01 — Repaso espaciado; 02 — Racha diaria; 03 — Tienda de monedas; 04 — Looks de Coco; 05 — Práctica libre (forma de `Progress`, versión 6)
> **Fecha:** 2026-09-18
> **Objetivo:** Guardar el progreso en Supabase con cuentas por magic link, sesión obligatoria y sincronización entre dispositivos, sin localStorage.

## Alcance

**Dentro:**

- Cuentas con magic link (correo) vía Supabase Auth. Sin contraseñas.
- Login obligatorio: sin sesión, `/`, `/notebook`, `/review`, `/shop` y `/mision/[slug]` redirigen a `/login`.
- Ruta `/login` con formulario de correo, estado "revisa tu correo" y error si el envío falla.
- Route Handler `/auth/confirm` que canjea el código del enlace y redirige al mapa.
- Correo del usuario y botón "Salir" en el header de `AppShell`.
- Progreso en Supabase con 6 tablas normalizadas (`progress_core`, `streak_state`, `shop_state`, `looks_state`, `mission_progress`, `review_cards`) y RLS por `auth.uid()`.
- Carga en servidor: el layout raíz lee usuario y progreso, y el store se hidrata. Sin pantalla de carga y sin localStorage.
- Escrituras optimistas por sección en cada mutación; si fallan, banner persistente con reintento automático al reconectar y botón manual.
- `resetProgress` borra las filas del usuario en la nube.
- Se elimina localStorage: clave `english-mission:progress:v6`, migraciones v1–v5 y sus tests.
- Variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`, con `.env.example` y excepción en `.gitignore`.
- `supabase/schema.sql` idempotente, aplicado a mano en el SQL Editor.
- Dependencias nuevas: `@supabase/supabase-js` y `@supabase/ssr`.
- `AGENTS.md` deja de declarar el proyecto "sin backend, sin env vars".
- Tests de mappers, store con sync mockeada, `login-form`, `user-menu` y `/auth/confirm`; ajuste de `app-shell`.

**Fuera de alcance (para specs futuros):**

- Offline real, caché local o service worker: la app requiere conexión.
- Realtime o multi-pestaña en vivo.
- Rescatar el progreso local existente: se descarta a propósito.
- OAuth, contraseñas o recuperación de contraseña.
- Eliminar cuenta, cambiar correo o exportar datos.
- Rankings, perfiles públicos o funciones sociales.
- Supabase Storage, Edge Functions, CLI de Supabase o migraciones versionadas.
- E2E del magic link (Playwright); la verificación es manual.
- Cambios de comportamiento en misiones, repaso, tienda, looks o cuaderno.

## Modelo de datos

El progreso se normaliza en 6 tablas. Todas con RLS por `auth.uid() = user_id`; el cliente nunca puede tocar filas ajenas.

```sql
-- supabase/schema.sql (idempotente, se aplica en el SQL Editor)
create table if not exists public.progress_core (
  user_id uuid primary key references auth.users(id) on delete cascade,
  coins integer not null default 0 check (coins >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.streak_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current integer not null default 0 check (current >= 0),
  best integer not null default 0 check (best >= 0),
  last_day date,
  pending_milestone smallint check (pending_milestone in (3, 7, 30))
);

create table if not exists public.shop_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  day date,
  count integer not null default 0 check (count >= 0)
);

create table if not exists public.looks_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  equipped text not null default 'classic'
    check (equipped in ('classic', 'ocean', 'sunset', 'night', 'party')),
  owned text[] not null default '{}'::text[]
    check (owned <@ array['ocean', 'sunset', 'night', 'party']::text[])
);

create table if not exists public.mission_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  completed boolean not null default false,
  stars smallint not null default 0 check (stars between 0 and 3),
  best_coins integer not null default 0 check (best_coins >= 0),
  primary key (user_id, slug)
);

create table if not exists public.review_cards (
  user_id uuid not null references auth.users(id) on delete cascade,
  word_key text not null,
  box smallint not null default 1 check (box between 1 and 3),
  due_at bigint not null,
  last_reviewed_at bigint,
  primary key (user_id, word_key)
);

alter table public.progress_core enable row level security;
drop policy if exists "own rows" on public.progress_core;
create policy "own rows" on public.progress_core
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.streak_state enable row level security;
drop policy if exists "own rows" on public.streak_state;
create policy "own rows" on public.streak_state
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.shop_state enable row level security;
drop policy if exists "own rows" on public.shop_state;
create policy "own rows" on public.shop_state
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.looks_state enable row level security;
drop policy if exists "own rows" on public.looks_state;
create policy "own rows" on public.looks_state
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.mission_progress enable row level security;
drop policy if exists "own rows" on public.mission_progress;
create policy "own rows" on public.mission_progress
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.review_cards enable row level security;
drop policy if exists "own rows" on public.review_cards;
create policy "own rows" on public.review_cards
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Convenciones:

- `word_key` es la misma clave del repaso: palabra en inglés, minúsculas y sin espacios sobrantes.
- `last_day` y `day` son fechas locales (`YYYY-MM-DD`), no timestamps.
- `due_at` y `last_reviewed_at` siguen en milisegundos epoch, igual que hoy.
- `updated_at` lo escribe la app en cada mutación; sin triggers.
- `Progress` se queda en `version: 6`: la forma no cambia, solo el almacenamiento.

```ts
// src/shared/lib/progress/progress-mappers.ts (puro, testeable)
export function toProgress(rows: {
  core: CoreRow;
  streak: StreakRow | null;
  shop: ShopRow | null;
  looks: LooksRow | null;
  missions: MissionRow[];
  reviews: ReviewRow[];
}): Progress;

export const CORE_ROW_DEFAULTS = { coins: 0 };

// Payloads de escritura por sección, valores absolutos (nunca incrementos).
export function corePayload(coins: number): CoreRow;
export function streakPayload(streak: StreakState): StreakRow;
export function shopPayload(shop: ShopState): ShopRow;
export function looksPayload(looks: LooksState): LooksRow;
export function missionPayload(slug: string, mission: MissionProgress): MissionRow;
export function reviewPayload(key: string, card: ReviewCard): ReviewRow;
```

```ts
// src/shared/lib/progress/progress-repository.server.ts
import 'server-only';

// Idempotente: crea filas por defecto si faltan y devuelve el progreso completo.
export async function readProgress(userId: string): Promise<Progress>;
```

```ts
// src/shared/lib/supabase/server.ts y browser.ts
export function createSupabaseServerClient(): SupabaseClient;
export function createSupabaseBrowserClient(): SupabaseClient;
// env.ts: lee NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.
```

El store mantiene su API actual (`addCoins`, `spendCoins`, `selectLook`, `recordRecharge`, `recordMissionResult`, `recordReviewResult`, `registerDailyActivity`, `clearPendingMilestone`, `resetProgress`) y cambia solo por dentro:

```ts
export function initProgress(progress: Progress, userId: string): void;
// Cada mutación calcula el siguiente estado, notifica (optimista) y encola
// una operación con los payloads de las secciones afectadas.
```

```ts
// src/shared/lib/progress/progress-sync.ts
export type SyncStatus = {
  state: 'idle' | 'syncing' | 'error';
  pending: number;
};

// La capa inicial hace upsert directo. Grupo 4 agrega cola y reintentos.
export function enqueue(operation: SyncOperation): void;
export function subscribeSync(listener: () => void): () => void;
export function getSyncSnapshot(): SyncStatus;
```

Convenciones del modelo:

- `resetProgress` borra las filas del usuario (6 `delete`), no crea filas nuevas.
- El primer arranque con sesión crea las 4 filas raíz con sus valores por defecto; `mission_progress` y `review_cards` nacen vacías.
- Las reglas puras existentes (`nextStreak`, `nextShop`, `nextLooks`, `nextCard`, pesos de monedas) no cambian.
- Los validadores del store actual se mueven a `progress-mappers.ts` y protegen también contra filas corruptas de la nube.

## Plan de implementación

### Grupo 1 — Infraestructura Supabase

- [x] 1.1 Agregar dependencias `@supabase/supabase-js` y `@supabase/ssr`.
- [x] 1.2 Crear `src/shared/lib/supabase/env.ts` (lee `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`, lanza error claro si faltan), `browser.ts` (`createBrowserClient`) y `server.ts` (`server-only`, `createServerClient` con `await cookies()`, `getAll`/`setAll` con `try/catch`, más `getCurrentUser()`).
- [x] 1.3 Crear `.env.example` con las dos variables y agregar `!.env.example` a `.gitignore`.
- [x] 1.4 Crear `supabase/schema.sql` idempotente: 6 tablas, CHECKs y RLS con una política `own rows` por tabla (`auth.uid() = user_id`, `for all to authenticated`).
- [x] 1.5 Configurar el dashboard de Supabase: crear proyecto, ejecutar `schema.sql`, agregar `http://localhost:3000/**` y el dominio de producción a Redirect URLs, y revisar la plantilla del correo de magic link.

### Grupo 2 — Cuentas y sesión

- [x] 2.1 Crear `src/proxy.ts`: refresca la sesión con `@supabase/ssr` (`getClaims`) y redirige a `/login` sin sesión; con sesión, redirige `/login` a `/`. `matcher` excluye `_next/static`, `_next/image`, assets y `/auth/*`.
- [x] 2.2 Crear `src/features/auth/services/auth.service.ts` y `src/features/auth/components/login-form.tsx` + test: correo, estados idle/enviando/enviado/error, y llamado a `signInWithMagicLink`.
- [x] 2.3 Crear `src/app/login/page.tsx` con metadata "Acceso"; sin `AppShell`.
- [x] 2.4 Crear `src/app/auth/confirm/route.ts` + test: valida `code` y `next` (solo rutas internas), canjea con `exchangeCodeForSession` y redirige; sin código o con error redirige a `/login` con aviso.
- [x] 2.5 Crear `src/features/auth/components/user-menu.tsx` + test y conectar `AppShell`: correo visible, botón "Salir", prop `account?: ReactNode`; `(app)/layout.tsx` lee usuario en servidor y compone `account={<UserMenu email={...}/>} `.

### Grupo 3 — Progreso en la nube

- [x] 3.1 Crear `src/shared/lib/progress/progress-mappers.ts` + test: tipos de fila, `toProgress` con valores por defecto para filas nulas, payloads por sección y validadores movidos desde el store. Tests de filas completas, nulas y corruptas.
- [x] 3.2 Crear `src/shared/lib/progress/progress-repository.server.ts` + test: `readProgress(userId)` crea las 4 filas raíz si faltan (`on conflict do nothing`) y devuelve el `Progress` completo; test con mock del cliente servidor.
- [x] 3.3 Reescribir `progress-store.ts` y la capa inicial de `progress-sync.ts`: sin localStorage ni migraciones; `initProgress(progress, userId)`, snapshot `emptyProgress` por defecto, mutaciones optimistas y upsert por sección. `resetProgress` borra las filas. Reescribir `progress-store.test.ts`.
- [x] 3.4 Crear `src/shared/components/progress-provider.tsx`; en `src/app/layout.tsx`, leer usuario y progreso en servidor y envolver `{children}` con `ProgressProvider`. Ajustar `app-shell.test.tsx` y verificar que mission, review, shop y notebook siguen pasando.

### Grupo 4 — Reintentos y aviso

- [x] 4.1 Completar `src/shared/lib/progress/progress-sync.ts` + test: cliente de navegador, cola FIFO de operaciones con payloads absolutos, `flush()` idempotente, reintento al evento `online`, `retry()` y snapshot (`idle`/`syncing`/`error`, pendientes).
- [x] 4.2 Crear `src/shared/components/sync-banner.tsx` + test: oculto en `idle`, visible con mensaje de error y botón "Reintentar" que llama a `retry()`. Montarlo dentro de `ProgressProvider`.
- [x] 4.3 Agregar test de integración de cola: una escritura fallida deja `error` con pendientes; al reintentar con red vuelve a `idle` con 0 pendientes y conserva el estado optimista.

### Grupo 5 — Limpieza y documentación

- [x] 5.1 Verificar con grep que no queden referencias a `english-mission:progress`, `LEGACY_` ni a las migraciones v1–v5.
- [x] 5.2 Actualizar `AGENTS.md`: quitar "fully client-side, no backend, no env vars"; documentar Supabase, variables de entorno, esquema, flujo de auth y sync.
- [x] 5.3 Actualizar el README si menciona la arquitectura sin backend; subir versión a 1.1.0 en `package.json` y `src/shared/lib/app-version.ts`.
- [x] 5.4 Dejar documentado el recorrido manual de conexión: magic link real, progreso entre dos navegadores, salir, corte de red con reintento y reiniciar progreso.

## Criterios de aceptación

**Esquema y seguridad**

- [ ] `supabase/schema.sql` define las 6 tablas con sus CHECK y habilita RLS con una política `own rows` (`auth.uid() = user_id`) en cada una (revisión del archivo).
- [ ] Con dos cuentas de prueba, ninguna puede leer ni escribir filas de la otra (verificación manual en Supabase).

**Sesión y acceso**

- [ ] `/auth/confirm` con `code` válido canjea la sesión y redirige a `/` (test del route handler).
- [ ] `/auth/confirm` sin `code` o con error redirige a `/login` con aviso (test del route handler).
- [ ] `next` con URL externa se ignora y redirige a `/` (test del route handler).
- [ ] `login-form` con correo válido llama a `signInWithMagicLink` y muestra "revisa tu correo" (test de componente).
- [ ] `login-form` muestra error cuando el envío falla (test de componente).
- [ ] `user-menu` muestra el correo y "Salir" llama a `signOut` y navega a `/login` (test de componente).
- [ ] `AppShell` pinta el slot `account` en el header (test de componente).
- [ ] Sin sesión, `/`, `/notebook`, `/review`, `/shop` y `/mision/[slug]` redirigen a `/login`; con sesión, `/login` redirige a `/` (prueba manual).

**Progreso y sincronización**

- [ ] `toProgress` con filas nulas devuelve el progreso por defecto (test unitario).
- [ ] `toProgress` con filas completas reconstruye misiones, repaso, racha, tienda, looks y monedas (test unitario).
- [ ] Filas corruptas se descartan y caen a valores por defecto (test unitario).
- [ ] `readProgress` crea las filas raíz faltantes sin pisar las existentes y devuelve el progreso completo (test unitario con mock del cliente servidor).
- [ ] `initProgress` deja `getProgressSnapshot()` con los datos del servidor (test unitario).
- [ ] Sin `initProgress`, el snapshot es `emptyProgress` (test unitario).
- [ ] Cada mutación encola exactamente sus secciones: `addCoins` → core; `recordReviewResult` → tarjeta; `recordMissionResult` → misión + core; `registerDailyActivity` → racha + core; `recordRecharge` → tienda + core; `selectLook` → looks + core (tests unitarios).
- [ ] Los payloads son absolutos: encolar dos veces la misma operación produce el mismo payload (test unitario).
- [ ] `resetProgress` deja el store vacío y encola el borrado de las 6 tablas (test unitario).
- [ ] Una operación fallida deja el estado en `error` con pendientes; `retry()` con red vuelve a `idle` con 0 pendientes y conserva el estado optimista (test unitario).
- [ ] El evento `online` dispara el reintento (test unitario).
- [ ] `sync-banner` se oculta en `idle` y en `error` muestra el aviso y el botón "Reintentar" que llama a `retry()` (test de componente).

**Limpieza y verificación**

- [ ] `src/` no contiene referencias a `english-mission:progress`, `LEGACY_` ni a las migraciones v1–v5 (grep).
- [ ] Los tests de mission, review, shop y notebook pasan sin cambios (test suite).
- [ ] `AGENTS.md` ya no declara el proyecto "sin backend, sin env vars" (grep).
- [ ] `rtk pnpm lint`, `rtk tsc --noEmit`, `rtk pnpm test` y `rtk pnpm build` pasan.
- [ ] Recorrido manual: magic link real, progreso visible en dos navegadores, salir, corte de red con banner y reconexión sin perder datos.

## Decisiones

- **Sí:** Supabase como backend único (Auth + Postgres). Es el servicio ya previsto por el proyecto; no se agrega nada más.
- **No:** InsForge u otro backend. Evita comparativas y trabajo duplicado.
- **Sí:** magic link como único método. Sin contraseñas que validar, resetear ni almacenar.
- **No:** OAuth con Google ni correo + contraseña. Más configuración externa y más UI para el mismo resultado.
- **Sí:** login obligatorio; sin sesión solo existe `/login`. Un estado, sin progreso que se pierda en silencio.
- **No:** modo invitado o juego abierto sin cuenta. Con la nube como única fuente, un invitado no tendría dónde guardar.
- **Sí:** `@supabase/ssr` con sesión en cookies y `proxy.ts`. Flujo oficial, sin parpadeo y sin que el cliente maneje tokens a mano.
- **No:** cliente puro con callback en página cliente. Sesión menos robusta y fuera de la convención de Next 16.
- **Sí:** lectura del progreso en el servidor y store hidratado por `ProgressProvider`. La primera pintura ya trae el progreso real.
- **No:** fetch en cliente con pantalla de carga. Agrega estado intermedio y un frame con datos falsos.
- **Sí:** 6 tablas normalizadas, elección explícita del usuario. Permite CHECKs y consultas por sección desde la base.
- **No:** una fila con JSONB. Rechazada aunque el progreso se lee y escribe completo; se documenta el costo (mapeo y payloads por sección).
- **Sí:** escrituras desde el cliente con RLS (`auth.uid() = user_id`). Un salto de red y la base es la autorización real.
- **No:** route handler `/api/progress` intermedio. Latencia y archivos extra sin ganancia de seguridad con RLS.
- **Sí:** payloads absolutos e idempotentes con cola FIFO de reintento. Reintentar jamás duplica ni suma de más.
- **No:** incrementos (`coins = coins + 5`) ni RPC transaccionales. Duplicarían en SQL las reglas puras ya testeadas.
- **Sí:** banner persistente con reintento automático al reconectar y botón manual.
- **No:** reintento silencioso ni modal bloqueante. Silencio confunde; modal estorba jugando.
- **Sí:** descartar el progreso local existente. Es la opción más simple y fue decisión consciente.
- **No:** merge o subida del progreso local al primer login. Abre reglas de conflicto que nadie pidió.
- **Sí:** borrar localStorage, sus migraciones v1–v5 y sus tests. La nube es la única fuente.
- **No:** conservar el código de migraciones sin uso. Ruido y tests que ya no protegen nada.
- **Sí:** `supabase/schema.sql` idempotente aplicado a mano en el SQL Editor.
- **No:** CLI de Supabase o migraciones versionadas. Queda para un spec futuro si el equipo lo pide.
- **Sí:** `features/auth` para UI y servicio de auth; el progreso se queda en `shared/lib/progress` porque lo consumen 5 features.
- **No:** `features/progress`. Sería otra copia de algo transversal.
- **Sí:** `AppShell` recibe `account` como `ReactNode` compuesto por el layout de ruta. Respeta que un feature no importe a otro.
- **No:** que shell importe `features/auth` directamente.
- **Sí:** `Progress` se queda en `version: 6`; la forma no cambia, solo el almacenamiento.
- **No:** offline, caché local, service worker o realtime. Fuera de alcance; la app requiere conexión.
- **Sí:** bump a 1.1.0 en `package.json` y `app-version.ts`.
- **No:** OAuth, eliminar cuenta, rankings, Storage o Edge Functions. Cada uno, si entra, va en su propia spec.

## Riesgos

| Riesgo                                                           | Mitigación                                                                                                                                  |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Magic link no vuelve a la app por Redirect URLs mal configuradas | Documentar la configuración en el grupo 1 y probar localhost y producción antes de cerrar la spec.                                          |
| Sesión expirada a mitad de partida por cookies vencidas          | `proxy.ts` refresca con el patrón oficial de `@supabase/ssr`; si la escritura falla, el banner avisa y la cola reintenta.                   |
| Escritura parcial (misión + monedas) deja estado a medias        | Payloads absolutos + cola FIFO idempotente: el reintento converge al último estado y nunca suma dos veces.                                  |
| Filas corruptas o incompletas en la nube                         | CHECKs en la base y validadores en `toProgress`; cada sección cae a su valor por defecto sin romper la app.                                 |
| RLS mal aplicada y fuga de datos entre cuentas                   | Política `own rows` en las 6 tablas y prueba manual con dos cuentas como criterio de aceptación.                                            |
| Pérdida del progreso local existente al descartarlo              | Decisión consciente y documentada. No se rescata nada; no hay migración ni merge.                                                           |
| Hydration mismatch entre progreso del servidor y store cliente   | `ProgressProvider` inicializa el store antes de renderizar consumidores; el snapshot del servidor en `useSyncExternalStore` no cambia.      |
| Dos pestañas o dispositivos a la vez                             | Last write wins, sin realtime. Fuera de alcance; un refresco trae el estado más reciente.                                                   |
| Supabase caído o sin internet                                    | La app requiere conexión: el login no funciona y las escrituras se encolan con aviso. Sin modo offline, por alcance.                        |
| Tests existentes rotos por el cambio de almacenamiento           | El store conserva la API pública y `src/test/setup.ts` resetea con `emptyProgress`; los tests de features no se tocan.                      |
| Filtración de secretos                                           | Solo la anon key pública en `NEXT_PUBLIC_*`; la service role jamás entra al repo ni al bundle. `.env*` sigue ignorado salvo `.env.example`. |
| Rate limit de correos del plan gratuito de Supabase              | Suficiente para desarrollo y pruebas; si molesta en producción, se configura SMTP propio en un spec futuro.                                 |

## Lo que **no** entra en esta spec

- Offline real, caché local, service worker o realtime.
- Merge o migración del progreso local existente.
- OAuth, contraseñas, recuperación de contraseña, eliminar cuenta o cambiar correo.
- Rankings, perfiles públicos, funciones sociales o multiusuario.
- Supabase Storage, Edge Functions, CLI de Supabase o migraciones versionadas.
- E2E del magic link con Playwright.
- Cambios de comportamiento en misiones, repaso, tienda, looks o cuaderno.

Cada uno, si entra, va en su propia spec.
