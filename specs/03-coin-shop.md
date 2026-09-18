# SPEC 03 — Tienda de monedas

> **Estado:** Implementado
> **Depende de:** 02 — Racha diaria (progreso v4)
> **Fecha:** 2026-09-18
> **Objetivo:** Agregar una tienda en `/shop` donde un ejercicio `choice` de vocabulario visto paga monedas según los intentos (10/5/5/0, sin pago al revelar), con tope de 3 recargas por día calendario local.

## Alcance

**Dentro:**

- Nueva ruta `/shop` con la sesión de recarga.
- Tarjeta "Tienda de monedas" en el mapa, siempre visible, que enlaza a `/shop`.
- Cada recarga es un ejercicio `choice` (español → inglés) con una palabra aleatoria del vocabulario visto (misiones completadas, mismo pool que repaso) y 2 distractores.
- Pago fijo con el perfil de nivel 1: 10 monedas al primer intento, 5 con 1–2 fallos o con pista usada, 0 al revelarse a los 3 intentos.
- Pista gratis ("Pista gratis") que cuenta como fallo para el pago.
- Si el ejercicio paga 0 (respuesta revelada), no consume cupo y se puede reintentar de inmediato.
- Cupo de 3 recargas pagadas por día calendario local, con contador "Recargas hoy: X/3" dentro de la tienda.
- Estado de tienda en el progreso: `shop: { day, count }`. Migración v4 → v5 (y cadena v3/v2/v1 → v5). Reiniciar progreso borra la tienda.
- Estado vacío sin misiones completadas: "Completa una misión para desbloquear la tienda".
- Estado de cupo agotado: botón deshabilitado con "Vuelve mañana".
- Resultado tras cada recarga: monedas ganadas, saldo actual, botón "Recargar otra vez" (si queda cupo) y "Volver al mapa".
- La recarga solo suma monedas: no marca racha ni crea/actualiza tarjetas de repaso.

**Fuera de alcance (para specs futuros):**

- Cosméticos o cualquier gasto de monedas en la tienda.
- Comprar con dinero real, pagos o backend.
- Protección o congelación de racha.
- Ejercicios `type`, `listen`, `order`, `fill` o `dialogue` en la tienda.
- Más de un ejercicio por recarga.
- Notificaciones o recordatorios de cupo.
- Escribir las misiones 5–12.

## Modelo de datos

```ts
// src/lib/progress/types.ts
export type ShopState = {
  day: string | null; // YYYY-MM-DD en fecha local, mismo formato que streak.lastDay
  count: number; // recargas pagadas de ese día
};

export type Progress = {
  version: 5;
  coins: number;
  missions: Record<string, MissionProgress>;
  reviews: Record<string, ReviewCard>;
  streak: StreakState;
  shop: ShopState;
};
```

Convenciones:

- Clave de localStorage: `english-mission:progress:v5`. Migra v4, v3, v2 y v1 agregando `shop` vacío, y borra las claves viejas.
- Estado inicial: `{ day: null, count: 0 }`. `resetProgress` deja la tienda vacía porque `emptyProgress` ya la incluye.
- Validador `isShopState`: `count` entero ≥ 0; `day` es `null` o `YYYY-MM-DD`. `isProgress` exige `version === 5`.
- Lógica pura en `src/lib/progress/shop.ts` (reutiliza `localDayKey` de `streak.ts`):
  - `MAX_DAILY_RECHARGES = 3`.
  - `rechargesUsed(shop, day): number` — `count` si `shop.day === day`, si no `0`.
  - `canRecharge(shop, day): boolean` — `rechargesUsed < MAX_DAILY_RECHARGES`.
  - `nextShop(shop, day): ShopState` — si cambió el día arranca `{ day, count: 1 }`; si no, suma 1.
- En el store (`progress-store.ts`): `recordRecharge(payout: number, now: number = Date.now()): boolean` — si `canRecharge` es falso devuelve `false` sin mutar; si no, suma `payout` a `coins`, aplica `nextShop` y persiste.
- Lógica de la tienda en `src/features/shop/utils/shop-exercise.ts`:
  - `pickShopWord(pool, random = Math.random): ReviewWord | null` — palabra aleatoria; `null` con pool vacío.
  - `buildShopChallenge(pool, random = Math.random): Challenge | null` — reutiliza `buildReviewChallenge` con `box: 1` (opción múltiple español → inglés); `null` sin palabras.
  - `SHOP_PROFILE = profileFor(1)` — pago fijo 10/5/5/0 sin importar el nivel de la palabra.
  - `shopPayout(wrongAttempts, hintUsed): number` — `coinsForAttempt(wrongAttempts + (hintUsed ? 1 : 0), SHOP_PROFILE)`.
- Pool de palabras: `buildReviewPool(progress)` de `src/features/review/utils/review-queue.ts` (vocabulario de misiones completadas, deduplicado). Import cruzado entre features aceptado: es una función pura ya testeada.
- La tienda no escribe `reviews` ni llama `registerDailyActivity`.

## Plan de implementación

### Grupo 1 — Progreso v5 y cupo diario

- [x] 1.1 En `src/lib/progress/types.ts`: agregar `ShopState` y `shop` a `Progress`, subir `version` a `5`.
- [x] 1.2 Crear `src/lib/progress/shop.ts` con `MAX_DAILY_RECHARGES`, `rechargesUsed`, `canRecharge` y `nextShop` (reutiliza `localDayKey` de `streak.ts`). Test unitario en `shop.test.ts`: mismo día acumula, día distinto reinicia, tope 3, `day: null` cuenta 0.
- [x] 1.3 En `src/lib/progress/progress-store.ts`: key `english-mission:progress:v5`, validador `isShopState`, migraciones v4/v3/v2/v1 → v5 con `shop` vacío, `recordRecharge(payout, now)` que no muta si el cupo se agotó y devuelve `false`, y `emptyProgress` con tienda vacía. Ampliar `progress-store.test.ts`: migrar v4 conserva monedas, misiones, repaso y racha y agrega `shop`; `recordRecharge` suma monedas y contador; la cuarta recarga del día no muta y devuelve `false`; el día siguiente reinicia el contador; reset deja `shop` vacío.

### Grupo 2 — Lógica y sesión de la tienda

- [x] 2.1 Crear `src/features/shop/utils/shop-exercise.ts` con `pickShopWord`, `buildShopChallenge`, `SHOP_PROFILE` y `shopPayout`. Tests unitarios: pool vacío devuelve `null`; con `random` inyectado elige la palabra del pool; el reto es `choice` con 3 opciones y `correct` apuntando a la palabra; pago 10 limpio, 5 con un fallo, 5 solo con pista, 5 con pista y un fallo, 0 con pista y dos fallos.
- [x] 2.2 Crear `src/features/shop/hooks/use-shop-run.ts`: máquina de estados `phase: "ready" | "playing" | "result"`, cupo del día, reto actual y pago de la última recarga. Al resolver calcula `shopPayout` y, si es > 0, llama `recordRecharge(pago)`; un revelado (pago 0) no consume cupo y permite reintentar.
- [x] 2.3 Crear `src/features/shop/components/shop-session.tsx`: estados vacío ("Completa una misión para desbloquear la tienda"), listo (saldo + "Recargas hoy: X/3" + botón "Ganar monedas"), jugando (reutiliza `ChoiceChallenge` con `rewardsEnabled: false`, `freeHints: true`, `coins: 0`, `onSpendCoins: () => false` y `profile: SHOP_PROFILE`) y resultado (monedas ganadas, saldo, "Recargar otra vez" si queda cupo, "Vuelve mañana" si no, "Volver al mapa"). El feedback interno dice "¡Correcto!"; el pago se muestra en el panel de resultado.
- [x] 2.4 Crear `src/app/shop/page.tsx` con metadata y montaje de la sesión, siguiendo el patrón de `src/app/review/page.tsx`.
- [x] 2.5 Crear `src/features/shop/components/shop-session.test.tsx`: sin misiones completadas muestra el estado vacío; con la misión 1 hecha muestra saldo y `0/3`; acertar suma 10 monedas y deja `1/3`; con pista el pago es 5; un revelado no consume cupo y permite reintentar; la tercera recarga pagada deshabilita el botón con "Vuelve mañana"; la recarga no crea tarjetas en `reviews`.

### Grupo 3 — Entrada desde el mapa

- [x] 3.1 `src/features/mission/components/mission-map.tsx`: tarjeta "Tienda de monedas" con icono `Storefront`, visible con o sin progreso, que enlaza a `/shop`.
- [x] 3.2 Ampliar `mission-map.test.tsx`: la tarjeta es visible sin progreso y con progreso, y apunta a `/shop`.

## Criterios de aceptación

- [x] Con progreso v4 en localStorage, abrir la app conserva monedas, misiones, repaso y racha, y deja `shop: { day: null, count: 0 }` en `english-mission:progress:v5` (test unitario).
- [x] La migración desde v3, v2 y v1 también produce v5 con tienda vacía (test unitario).
- [x] `rechargesUsed` devuelve 0 con `day: null` o con un día distinto, y `count` con el mismo día (test unitario).
- [x] `nextShop` arranca el contador en 1 al cambiar de día y suma 1 el mismo día (test unitario).
- [x] `canRecharge` es falso con 3 recargas pagadas del mismo día y verdadero con 2 (test unitario).
- [x] `recordRecharge` suma monedas y contador; con cupo agotado devuelve `false` y no muta (test unitario).
- [x] Reiniciar progreso deja `shop` vacío (test unitario).
- [x] `pickShopWord` devuelve `null` con pool vacío y una palabra del pool cuando hay vocabulario (test unitario).
- [x] `buildShopChallenge` arma un `choice` cuya opción correcta es la palabra elegida, con 2 distractores (test unitario).
- [x] `shopPayout` da 10 sin fallos ni pista, 5 con un fallo o con pista, 5 con pista y un fallo, y 0 con pista y dos fallos (test unitario).
- [x] `/shop` sin misiones completadas muestra el estado vacío y no ofrece ejercicio (test de componente).
- [x] Con la misión 1 completada, `/shop` muestra el saldo y "Recargas hoy: 0/3" (test de componente).
- [x] Acertar a la primera suma 10 monedas al saldo y deja "Recargas hoy: 1/3" persistido (test de componente).
- [x] La pista aparece como "Pista gratis", no descuenta monedas y baja el pago a 5 (test de componente).
- [x] Un revelado paga 0, no consume cupo y el botón de reintentar queda disponible (test de componente).
- [x] Tras 3 recargas pagadas el botón queda deshabilitado con "Vuelve mañana" (test de componente).
- [x] Recargar no crea ni modifica tarjetas de `reviews` ni marca la racha (test de componente).
- [x] El mapa muestra la tarjeta "Tienda de monedas" sin progreso y con progreso, y apunta a `/shop` (test de componente).
- [x] `pnpm lint`, `pnpm exec tsc --noEmit` y `pnpm test` pasan.

## Decisiones

- **Sí:** la tienda recarga monedas; no vende cosméticos. Resuelve "me quedé sin saldo"; cosméticos siguen fuera de alcance.
- **No:** dinero real, pagos o backend. La app es 100% cliente.
- **Sí:** tarjeta "Tienda de monedas" siempre visible en el mapa. Se descubre sin depender del saldo y es simple de testear.
- **No:** mostrar la tarjeta solo con saldo bajo. Lógica condicional extra sin ganancia clara.
- **Sí:** ruta `/shop`, consistente con `/review` y la decisión del spec 01 de nombrar rutas en inglés.
- **Sí:** un ejercicio `choice` por recarga, reutilizando `ChoiceChallenge` y el formato de caja 1 del repaso.
- **No:** sesiones de 3 ejercicios o tipos `type`/`listen`. Más superficie sin mejorar la recarga.
- **Sí:** pool de vocabulario visto (`buildReviewPool`, misiones completadas). No expone palabras nuevas y reutiliza una función testeada.
- **Sí:** importar `buildReviewPool` desde `features/review`. Moverlo a un módulo compartido es un refactor sin beneficio actual.
- **Sí:** pago fijo con perfil de nivel 1 (10/5/5/0) aunque la palabra sea de nivel 2–3. Tope real de 30 monedas/día, predecible.
- **No:** pago según el nivel de la palabra. Llegaría a 60/día y el spec 02 ya rechazó monedas fáciles.
- **Sí:** reutilizar `coinsForAttempt` con `profileFor(1)`. Una sola regla de pago en todo el juego.
- **Sí:** pista gratis que suma 1 al cálculo del pago. El usuario llega sin monedas; cobrar la pista contradice el caso de uso.
- **No:** pista sin penalización. Abriría farmeo con pistas.
- **Sí:** un revelado paga 0 y no consume cupo. Fallar no debe quemar una recarga del día.
- **Sí:** cupo persistido en `shop: { day, count }` y se consume solo cuando el pago es mayor que 0.
- **No:** cooldown por minutos. Más estado y peor UX; el tope diario alcanza.
- **Sí:** día calendario local con `localDayKey` del spec 02. Consistencia con la racha.
- **Sí:** `recordRecharge` valida el cupo y devuelve `boolean`, igual que `spendCoins`.
- **Sí:** el reto usa `rewardsEnabled: false` y el pago se muestra en el panel de resultado propio. El feedback interno de `useChallengeRun` ignora la pista y diría "+10" cuando el pago real es 5.
- **No:** tocar `useChallengeRun` o `successMessage` para la tienda. Hook compartido por todas las misiones; no se cambia por un texto.
- **Sí:** la tienda no marca racha ni agenda repaso. La racha sigue siendo misión o repaso (spec 02).
- **No:** marcar la racha al recargar. Reabre reglas y tests del spec 02.
- **Sí:** estado vacío en `/shop` sin misiones completadas, sin ocultar la tarjeta del mapa.
- **No:** usar vocabulario de la misión 1 sin completarla. Mostraría palabras no vistas.
- **No:** pago plano de 5 al completar. Premiaría fallar sin costo.
- **Sí:** `random` inyectable en `pickShopWord` y `buildShopChallenge`. Tests deterministas sin depender del azar.

## Riesgos

| Riesgo                                               | Mitigación                                                                                                                                                 |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Farmeo de monedas                                    | Tope de 3 recargas pagadas por día local; máximo 30 monedas/día, acotado y predecible.                                                                     |
| Reloj o zona horaria cambiados                       | Mismo criterio que la racha: día local del dispositivo. Cambiar el reloj solo reinicia el cupo; app personal sin sincronización.                           |
| Reintentar tras un revelado hasta acertar            | El cupo solo se gasta al pagar; el esfuerzo mínimo sigue siendo resolver el ejercicio, que es el objetivo de aprendizaje.                                  |
| Pool sin palabras suficientes para 3 opciones        | El contenido garantiza 6–12 palabras por misión completada; si el pool no alcanza, `buildShopChallenge` devuelve `null` y `/shop` muestra el estado vacío. |
| Doble disparo del efecto (StrictMode/segundo render) | `canRecharge` se evalúa antes de jugar y `recordRecharge` no muta con cupo agotado; el reto resuelto no se puede reenviar.                                 |
| localStorage corrupto                                | El validador descarta el progreso inválido y arranca limpio; la tienda no es dato crítico.                                                                 |
| Contenido futuro (misiones 5–12)                     | El pool crece solo y el pago fijo no depende del nivel de la palabra; sin migración por contenido.                                                         |
