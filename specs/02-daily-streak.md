# SPEC 02 — Racha diaria en el mapa

> **Estado:** Implementado
> **Depende de:** 01 — Repaso espaciado (progreso v3)
> **Fecha:** 2026-09-18
> **Objetivo:** Una racha por día calendario local que premia la actividad diaria (completar una misión o repasar) con hitos de monedas a los 3/7/30 días, visible en el mapa.

## Alcance

**Dentro:**

- Estado de racha dentro del progreso: días seguidos, récord, último día activo y hito pendiente de avisar.
- Día activo = completar una misión (primera vez o repetida) o responder al menos un ejercicio en `/review`. Responder mal también cuenta.
- Día = fecha local del dispositivo (`YYYY-MM-DD`). Racha suma si el último día activo fue el día anterior; si no, vuelve a 1. Saltarse un día rompe la racha, pero el récord se conserva.
- Hitos únicos por racha: día 3 → +10 monedas, día 7 → +25, día 30 → +50. Al reiniciar la racha se pueden volver a ganar.
- Chip de racha en el mapa junto al de monedas: llama, número actual y récord. En cero muestra "Empieza hoy".
- Aviso en el mapa al volver de una actividad que cruzó un hito: "¡Racha de 7 días! +25 monedas", con botón para cerrarlo.
- Migración de progreso v3 → v4 (`english-mission:progress:v4`), con `streak` vacío. Reiniciar progreso también borra la racha.

**Fuera de alcance (para specs futuros):**

- Notificaciones, recordatorios o push.
- Meta con barra de ejercicios (la meta es 1 actividad, sin progreso parcial).
- Racha mostrada en Cuaderno, fin de misión o fin de repaso.
- Día de gracia, congelar racha o comprar protección.
- Tienda de cosméticos con monedas.
- Exportar/importar progreso.
- Escribir las misiones 5–12.

## Modelo de datos

```ts
// src/lib/progress/types.ts
export type StreakMilestone = 3 | 7 | 30;

export type StreakState = {
  current: number;
  best: number;
  lastDay: string | null; // YYYY-MM-DD en fecha local
  pendingMilestone: StreakMilestone | null;
};

export type Progress = {
  version: 4;
  coins: number;
  missions: Record<string, MissionProgress>;
  reviews: Record<string, ReviewCard>;
  streak: StreakState;
};
```

Convenciones:

- Clave de localStorage: `english-mission:progress:v4`. Migra `v3`, `v2` y `v1` existentes, agrega `streak` vacío y borra las keys viejas.
- Estado inicial: `{ current: 0, best: 0, lastDay: null, pendingMilestone: null }`.
- Lógica pura en `src/lib/progress/streak.ts`:
  - `localDayKey(date: Date): string` — arma `YYYY-MM-DD` con `getFullYear/getMonth/getDate` locales, con padding.
  - `previousDayKey(day: string): string` — construye `new Date(y, m - 1, d - 1)` y formatea; el constructor resuelve rollover de mes/año y DST.
  - `STREAK_MILESTONES = { 3: 10, 7: 25, 30: 50 }`.
  - `nextStreak(state, day): { streak: StreakState; payout: number }` — si `lastDay === day` devuelve el estado intacto y `payout: 0`; si `lastDay === previousDayKey(day)` sube `current + 1`; en cualquier otro caso `current = 1`. Actualiza `best`, y si `current` está en `STREAK_MILESTONES` fija `pendingMilestone` y devuelve el payout.
- En el store (`progress-store.ts`):
  - `registerDailyActivity(now = Date.now())` — calcula el día, aplica `nextStreak`, suma el payout y persiste. Si el día ya estaba registrado no muta ni notifica.
  - `clearPendingMilestone()` — pone `pendingMilestone` en `null`; lo llama el aviso al cerrarse.
- Disparadores: `use-mission-run.ts` llama `registerDailyActivity()` en el mismo efecto que guarda el resultado al llegar a `phase === "complete"` (vale primera vez y repetición); `use-review-run.ts` lo llama en cada respuesta (idempotente: solo la primera del día muta).
- `resetProgress` borra la racha porque `emptyProgress` ya la incluye vacía.
- El chip muestra `current`; el récord (`best`) va en el texto accesible (`aria-label` / `title`).

## Plan de implementación

### Grupo 1 — Progreso v4 y lógica de racha

- [x] 1.1 En `src/lib/progress/types.ts`: agregar `StreakMilestone`, `StreakState` y `streak` a `Progress`, subir `version` a `4`.
- [x] 1.2 Crear `src/lib/progress/streak.ts` con `localDayKey`, `previousDayKey`, `STREAK_MILESTONES` y `nextStreak`. Test unitario en `streak.test.ts`: mismo día no cambia, día siguiente sube, salto resetea a 1, `best` se conserva, hito paga una sola vez, `previousDayKey` cruza fin de mes y fin de año.
- [x] 1.3 En `src/lib/progress/progress-store.ts`: key `english-mission:progress:v4`, validador `isStreakState`, migraciones v3/v2/v1 → v4 con `streak` vacío, `registerDailyActivity(now)` (no muta si el día ya está registrado), `clearPendingMilestone`, y `emptyProgress` con racha vacía. Ampliar `progress-store.test.ts`: migración desde v3 conserva monedas, misiones y repaso; segundo `registerDailyActivity` del mismo día no muta; hito suma monedas y fija `pendingMilestone`; `clearPendingMilestone` limpia; reset deja racha vacía.

### Grupo 2 — Disparadores en misión y repaso

- [x] 2.1 `src/features/mission/hooks/use-mission-run.ts`: llamar `registerDailyActivity()` en el efecto que guarda el resultado al llegar a `complete`.
- [x] 2.2 `src/features/review/hooks/use-review-run.ts`: llamar `registerDailyActivity()` en `answer`.
- [x] 2.3 Ampliar `mission-player.test.tsx` y `review-session.test.tsx`: completar una misión sube la racha a 1; responder un ejercicio la sube a 1; una segunda actividad del mismo día la deja igual.

### Grupo 3 — Chip y aviso en el mapa

- [x] 3.1 `src/features/mission/components/mission-map.tsx`: chip de racha junto al de monedas con llama y `current`; en cero muestra "Empieza hoy"; `aria-label` incluye el récord.
- [x] 3.2 Aviso de hito pendiente en el mapa ("¡Racha de 7 días! +25 monedas") con botón de cierre que llama `clearPendingMilestone`.
- [x] 3.3 Ampliar `mission-map.test.tsx`: chip visible con racha 0; con racha 5 muestra 5; aviso visible con `pendingMilestone: 7`, cerrar lo oculta y persiste; sin `pendingMilestone` no hay aviso.

## Criterios de aceptación

- [x] Con progreso v3 en localStorage, abrir la app conserva monedas, misiones y repaso, y deja `streak` vacío en `english-mission:progress:v4` (test unitario).
- [x] La migración desde v2 y v1 también produce v4 con racha vacía (test unitario).
- [x] `nextStreak` con el mismo día no cambia `current` ni paga (test unitario).
- [x] `nextStreak` con el día anterior sube `current` en 1 y actualiza `best` (test unitario).
- [x] `nextStreak` con un hueco de 2 o más días deja `current` en 1 y conserva `best` (test unitario).
- [x] Un hito paga 10/25/50 una sola vez por racha y deja `pendingMilestone`; un día sin hito no paga (tests unitario y de store).
- [x] `registerDailyActivity` dos veces el mismo día no muta el progreso (test unitario).
- [x] Completar la misión 1 sube la racha a 1 y la persiste en localStorage (test de componente).
- [x] Responder un ejercicio de repaso sube la racha a 1; el segundo del mismo día no la cambia (test de componente).
- [x] El mapa muestra el chip con "Empieza hoy" en racha 0 y con el número en racha 5 (test de componente).
- [x] El `aria-label` del chip incluye el récord (test de componente).
- [x] Con `pendingMilestone: 7`, el mapa muestra el aviso "+25 monedas"; cerrarlo lo oculta y no reaparece (test de componente).
- [x] Reiniciar progreso deja `streak` vacío (test unitario).
- [x] `pnpm lint`, `pnpm exec tsc --noEmit` y `pnpm test` pasan.

## Decisiones

- **Sí:** racha dentro del progreso v4. Una sola fuente de verdad y un solo botón de reinicio, igual que la agenda del spec 01.
- **Sí:** día calendario local (`YYYY-MM-DD`). Una racha de "días seguidos" debe leerse como días reales.
- **No:** ventana de 24 h, aunque el spec 01 la use para repaso. Es un concepto distinto: ahí mide vencimiento, aquí mide constancia.
- **No:** corte a las 4 AM. Más lógica y más tests sin ganancia clara para esta app.
- **Sí:** completar una misión (primera vez o repetida) o responder al menos un ejercicio de repaso marca el día. Dos formas de mantener la racha, el usuario elige.
- **Sí:** responder mal también cuenta. La racha premia constancia, no perfección.
- **Sí:** meta = 1 actividad diaria. Sin barra ni progreso parcial; racha y meta son el mismo evento.
- **Sí:** saltar un día deja `current` en 1 al volver y conserva `best`. Regla clásica, fácil de explicar.
- **No:** día de gracia o congelar racha. Reabre reglas y estado intermedio.
- **Sí:** hitos 3/7/30 pagan 10/25/50 y se pueden volver a ganar en una racha nueva. Acotado por calendario: no es farmeable.
- **No:** monedas por cada día activo. Infla la economía y el spec 01 ya rechazó monedas fáciles.
- **Sí:** aviso de hito persistido (`pendingMilestone`) hasta cerrarlo. La actividad ocurre en `/mission/[slug]` o `/review`; el aviso debe sobrevivir la navegación al mapa.
- **No:** toast efímero o modal con animación. Menos código y menos tests.
- **Sí:** chip en el mapa junto al de monedas, visible también en cero ("Empieza hoy"). La feature se descubre sin ruido.
- **No:** racha en Cuaderno y pantallas finales. Cada superficie extra es UI y tests que mantener.
- **Sí:** lógica pura en `src/lib/progress/streak.ts`, siguiendo el patrón de `review/utils/schedule.ts`. Testeable sin DOM.
- **No:** mezclar toda la lógica dentro del store.
- **Sí:** `registerDailyActivity` idempotente: si el día ya está registrado no muta ni notifica. Resiste StrictMode y segundas actividades.
- **Sí:** `now` inyectable en `registerDailyActivity` y `nextStreak`. Tests con fecha fija, sin depender del reloj real.

## Riesgos

| Riesgo                                               | Mitigación                                                                                                                                                        |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cambio de zona horaria o reloj manual                | La racha sigue la fecha local del dispositivo. Registrar el mismo día dos veces es no-op; un salto de día resetea y se acepta. App personal, sin cuentas ni sync. |
| DST (días de 23/25 h)                                | `previousDayKey` usa el constructor local de `Date`, no aritmética de milisegundos; el rollover lo resuelve el runtime.                                           |
| Doble disparo del efecto (StrictMode/segundo render) | `registerDailyActivity` no muta si `lastDay ===` día actual; el segundo intento es no-op.                                                                         |
| Hito pendiente sin cerrar                            | Queda en el progreso y se muestra al abrir el mapa hasta que el usuario lo cierre; sin notificaciones ni spam.                                                    |
| Tests dependientes del reloj real                    | `now` inyectable en `nextStreak` y `registerDailyActivity`; los tests usan fechas fijas.                                                                          |
| localStorage corrupto o lleno                        | El validador descarta el progreso inválido y arranca limpio; la racha no es dato crítico.                                                                         |
| Contenido futuro (misiones 5–12)                     | La racha no depende del catálogo de misiones; la migración es por versión, no por contenido.                                                                      |
