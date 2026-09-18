# SPEC 01 — Repaso espaciado en el Cuaderno

> **Estado:** Implementado
> **Depende de:** —
> **Fecha:** 2026-09-18
> **Objetivo:** Agregar una sesión de repaso espaciado al Cuaderno que reagenda el vocabulario aprendido con un Leitner de 3 cajas y ejercicios generados por caja.

## Alcance

**Dentro:**

- Nueva ruta `/review` que corre la sesión de repaso.
- Botón "Repasar" en `/cuaderno` con contador de palabras vencidas.
- Tarjeta de acceso en el mapa (junto a "Cuaderno de vocabulario") cuando hay palabras vencidas.
- Agenda Leitner de 3 cajas en el progreso: acierto limpio sube de caja, fallo o pista o revelado vuelve a caja 1. Vencimientos a 1/3/7 días.
- Sesión de hasta 10 palabras vencidas, cada una con ejercicio según su caja: caja 1 → `choice`, caja 2 → `type`, caja 3 → `listen` (o `type` si el navegador no soporta voz).
- Reutilización de `ChoiceChallenge`, `TypeChallenge` y `ListenChallenge` existentes con `rewardsEnabled: false` y pistas gratuitas (pero cuentan como fallo).
- Guardado por respuesta: abandonar la sesión conserva lo respondido; lo no respondido sigue vencido.
- Pantalla de fin de sesión con resumen (palabras repasadas, subieron, repitieron) y mensaje de Coco.
- Migración de progreso v2 → v3 con `reviews` vacío. Reset de progreso borra también la agenda.

**Fuera de alcance (para specs futuros):**

- Repaso de gramática o beats narrativos.
- Monedas por repasar (ganar o gastar).
- Recordatorios, notificaciones o racha diaria.
- Sincronización en la nube o cuentas.
- Editar, borrar o marcar tarjetas manualmente.
- Ejercicios `order`, `fill` o `dialogue` en repaso.
- Escribir las misiones 5–12.

## Modelo de datos

```ts
// src/lib/progress/types.ts
export type ReviewBox = 1 | 2 | 3;

export type ReviewCard = {
  box: ReviewBox;
  dueAt: number; // epoch ms
  lastReviewedAt: number | null;
};

export type Progress = {
  version: 3;
  coins: number;
  missions: Record<string, MissionProgress>;
  reviews: Record<string, ReviewCard>; // clave: palabra en inglés, minúsculas
};
```

Convenciones:

- Clave de tarjeta: `en.trim().toLowerCase()`. Una palabra repetida en dos misiones comparte tarjeta.
- Clave de localStorage: `english-mission:progress:v3`. Al leer, migra `v2` y `v1` existentes y borra las keys viejas.
- Intervalos: `REVIEW_INTERVALS_MS = { 1: 1 día, 2: 3 días, 3: 7 días }`.
- Vencimiento: `dueAt = momento del repaso + intervalo de la caja resultante`.
- Tarjeta ausente = palabra vencida hoy. La tarjeta se crea al responder, no al armar la cola.
- Cola: `buildReviewQueue(progress, now)` en `src/features/review/utils/review-queue.ts` devuelve máximo 10 palabras vencidas, más vencida primero. Cada palabra lleva `key`, `en`, `es`, `level` y `chapter` de su misión.
- Ejercicio: `buildReviewChallenge(word, pool, speechAvailable)` en `src/features/review/utils/review-exercise.ts` devuelve un `Challenge` existente. Caja 1 → `choice` (español a inglés), caja 2 → `type`, caja 3 → `listen`, y `type` si no hay voz. Opciones de `choice`/`listen`: 1 correcta + 2 distractores, priorizando palabras del mismo capítulo. Con menos de 3 palabras en el cuaderno, la opción múltiple usa las disponibles.
- Resultado: `recordReviewResult(key, passed)` en el store. Acierto limpio: `box = min(box + 1, 3)`. Fallo, pista o revelado: `box = 1`. Siempre actualiza `dueAt` y `lastReviewedAt`.
- Pistas: `ChallengeProps` y `ChallengeFrame` ganan `freeHints?: boolean` opcional. En repaso muestra "Pista gratis" y no bloquea por monedas. Sin el prop, el comportamiento actual no cambia.

## Plan de implementación

### Grupo 1 — Progreso v3 y agenda

- [x] 1.1 En `src/lib/progress/types.ts`: agregar `ReviewBox`, `ReviewCard` y `reviews` a `Progress`, subir `version` a `3`.
- [x] 1.2 En `src/lib/progress/progress-store.ts`: key `english-mission:progress:v3`, validador `isReviewCard`, migración v2→v3 y v1→v3, `recordReviewResult(key, passed, now)`, `resetProgress` borra `reviews`. Test manual: jugar una misión con progreso v2 previo y ver que no se pierde nada.
- [x] 1.3 Actualizar `src/lib/progress/progress-store.test.ts`: migración desde v2 y v1, `recordReviewResult` sube y baja caja, reset limpia la agenda.

### Grupo 2 — Lógica pura de repaso

- [x] 2.1 Crear `src/features/review/utils/schedule.ts` con `REVIEW_INTERVALS_MS` y `nextCard(card, passed, now)`. Test unitario de las 3 cajas y del fallo.
- [x] 2.2 Crear `src/features/review/utils/review-queue.ts` con `buildReviewPool(progress)` y `buildReviewQueue(progress, now, limit = 10)`: deduplica, marca vencidas, ordena y corta en 10. Tests unitarios, incluida palabra sin tarjeta.
- [x] 2.3 Crear `src/features/review/utils/review-exercise.ts` con `buildReviewChallenge(word, pool, speechAvailable)`: caja 1 → `choice`, caja 2 → `type`, caja 3 → `listen` o `type` sin voz; distractores del mismo capítulo primero. Tests unitarios de cada caja y del caso con menos de 3 palabras.

### Grupo 3 — Pistas gratis en componentes existentes

- [x] 3.1 `src/features/mission/components/challenge-frame.tsx`: prop opcional `freeHints` que muestra "Pista gratis" y no bloquea por monedas. Sin el prop nada cambia.
- [x] 3.2 `challenge-props.ts` y las 3 componentes reutilizadas (`choice-challenge.tsx`, `type-challenge.tsx`, `listen-challenge.tsx`): aceptar y reenviar `freeHints`.
- [x] 3.3 Ampliar `choice-challenge.test.tsx` con un caso `freeHints`: la pista no descuenta monedas y el texto dice "Pista gratis".

### Grupo 4 — Sesión de repaso

- [x] 4.1 Crear `src/features/review/hooks/use-review-run.ts`: arma la cola, guarda cada respuesta al momento con `recordReviewResult`, acumula resumen y expone `phase: "playing" | "complete"`.
- [x] 4.2 Crear `src/features/review/components/review-session.tsx`: header con progreso, render por `beat.kind` igual que `mission-player.tsx`, submit externo con `form="challenge-form"`.
- [x] 4.3 Crear `src/features/review/components/review-summary.tsx`: palabras repasadas, subieron y repitieron, mensaje de Coco, botones "Repasar más" (si quedan vencidas) y "Volver al cuaderno".
- [x] 4.4 Crear `src/app/review/page.tsx`: monta la sesión; sin palabras vencidas muestra estado "Todo al día".
- [x] 4.5 Crear `src/features/review/components/review-session.test.tsx`: sesión de 2 palabras, guardado inmediato al responder y llegada al resumen.

### Grupo 5 — Entradas desde el Cuaderno y el mapa

- [x] 5.1 `notebook.tsx`: botón "Repasar" con contador de vencidas que apunta a `/review`, visible solo si hay al menos una.
- [x] 5.2 `mission-map.tsx`: tarjeta "Repasar vocabulario" junto al enlace del Cuaderno cuando hay vencidas.
- [x] 5.3 Actualizar `notebook.test.tsx` y `mission-map.test.tsx`: entrada visible con vencidas, oculta sin ellas.

## Criterios de aceptación

- [x] Con progreso v2 en localStorage, abrir la app conserva monedas y misiones, y deja `reviews: {}` en `english-mission:progress:v3` (test unitario).
- [x] El Cuaderno sin misiones completadas no muestra el botón "Repasar".
- [x] Tras completar la misión 1, el Cuaderno muestra "Repasar" con contador 8 (sus 8 palabras vencidas).
- [x] El mapa muestra la tarjeta "Repasar vocabulario" con vencidas y no la muestra sin ellas (test de componente).
- [x] Una sesión con 12 palabras vencidas repasa 10 y el resumen ofrece las 2 restantes.
- [x] Cada palabra usa el ejercicio de su caja: caja 1 → `choice`, caja 2 → `type`, caja 3 → `listen` con voz y `type` sin voz (tests unitarios).
- [x] Acierto limpio sube de caja con vencimiento a 1/3/7 días; fallo, pista o revelado devuelve a caja 1 con vencimiento a 1 día (tests unitarios de `nextCard` y `recordReviewResult`).
- [x] Responder una palabra y abandonar la sesión conserva su tarjeta actualizada (test de componente).
- [x] Repasar no cambia el saldo de monedas, ni siquiera al usar una pista (test de componente).
- [x] La pista en repaso no descuenta monedas, se muestra como "Pista gratis" y cuenta como fallo (test de componente).
- [x] El resumen final muestra repasadas, subieron y repitieron, y el botón "Repasar más" solo aparece si quedan vencidas.
- [x] `/review` sin palabras vencidas muestra el estado "Todo al día".
- [x] Reiniciar progreso deja `reviews` vacío (test unitario).
- [x] `pnpm lint`, `pnpm exec tsc --noEmit` y `pnpm test` pasan.

## Decisiones

- **Sí:** solo vocabulario de misiones completadas. Es lo que el Cuaderno ya colecciona; gramática queda para otro spec.
- **Sí:** Leitner de 3 cajas con intervalos 1/3/7 días. Determinista, testeable y suficiente para decenas de palabras.
- **No:** SM-2 con factor de facilidad. Más estado y más tests sin ganancia clara para este tamaño de vocabulario.
- **Sí:** vencimiento con timestamp y días de 24 h exactas. Menos código de fechas y tests estables.
- **No:** día de calendario local. Introduce lógica de zonas horarias sin beneficio visible.
- **Sí:** tarjeta por palabra en minúsculas, compartida entre misiones. El Cuaderno ya deduplica así.
- **No:** tarjeta por slug + palabra. Duplica repasos de la misma palabra.
- **Sí:** agenda dentro del progreso v3. Una sola fuente de verdad y un solo botón de reinicio.
- **No:** key separada en localStorage. Dos estados que se pueden desincronizar.
- **Sí:** creación perezosa de la tarjeta al responder. Mantiene la cola como función pura y no escribe durante el render.
- **No:** crear todas las tarjetas en la migración. Acopla la migración al catálogo de contenido.
- **Sí:** guardado por respuesta. Abandonar la sesión no pierde lo ya repasado.
- **Sí:** regla binaria limpia o repite. Fácil de explicar y de testear.
- **No:** puntaje por intentos. Agrega estado intermedio sin mejorar la agenda.
- **Sí:** reutilizar `ChoiceChallenge`, `TypeChallenge` y `ListenChallenge` con `rewardsEnabled: false` y `freeHints`. Menos código y misma experiencia.
- **No:** componentes de ejercicio nuevos para repaso. Duplicarían UI y tests.
- **Sí:** tope de 10 palabras por sesión. Sesiones cortas y frecuentes.
- **No:** monedas en repaso. Evita farmear y mantiene la economía en las misiones.
- **Sí:** rutas nuevas con nombre en inglés (`/review`). Consistencia con los identificadores del código.
- **No:** notificaciones, racha diaria, repaso de gramática y edición manual de tarjetas. Cada una va en su propio spec si llega.

## Riesgos

| Riesgo                                             | Mitigación                                                                                        |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Reloj del usuario cambiado o viaje de zona horaria | `dueAt` se compara contra el reloj local; es una app personal sin sincronización. Se acepta.      |
| Navegador sin voces en inglés                      | La caja 3 cae a ejercicio `type`. La caja 1 y 2 no dependen de voz.                               |
| Cuaderno con menos de 3 palabras                   | La opción múltiple usa las palabras disponibles; el mínimo es 2.                                  |
| Contenido nuevo agrega vocabulario                 | Creación perezosa de tarjetas: no hay migración que tocar al agregar misiones.                    |
| localStorage corrupto o lleno                      | El validador actual descarta el progreso inválido y arranca limpio; la agenda no es dato crítico. |

## Lo que **no** va en esta spec

- Repaso de gramática o beats narrativos.
- Monedas por repasar (ganar o gastar).
- Recordatorios, notificaciones o racha diaria.
- Sincronización en la nube o cuentas.
- Editar, borrar o marcar tarjetas manualmente.
- Ejercicios `order`, `fill` o `dialogue` en repaso.
- Escribir las misiones 5–12.

Cada uno de esos, si llega, va en su propio spec.
