# SPEC 04 — Looks de Coco

> **Estado:** Implementado
> **Depende de:** 03 — Tienda de monedas (progreso v5)
> **Fecha:** 2026-09-18
> **Objetivo:** Vender 4 looks de color de Coco en `/shop` para gastar monedas; comprar equipa el look y lo comprado queda persistido.

## Alcance

**Dentro:**

- Catálogo de 4 looks de pago de Coco en `/shop`, debajo de la recarga: Océano (25), Atardecer (40), Noche (60), Fiesta (80).
- Look por defecto “Coco clásico”, siempre gratis y siempre poseído.
- Cada look cambia camisa, cresta y fondo; la piel verde de Coco no cambia.
- Comprar un look no poseído descuenta monedas con `selectLook`, lo marca como poseído y lo equipa.
- Reequipar un look ya poseído (incluido el clásico) cuesta 0.
- Un solo look equipado a la vez.
- El look equipado se ve en todos los `CharacterAvatar` de Coco (misión, reto, gramática, repaso).
- Catálogo siempre visible en `/shop`, con o sin misión completada. La recarga sigue bloqueada sin vocabulario visto.
- Header de `/shop` pasa a “Tienda”.
- Estado en el progreso: looks poseídos + look equipado. Migración v5 → v6. Reiniciar progreso vuelve a Coco clásico.

**Fuera de alcance (para specs futuros):**

- Looks o ropa del resto del elenco.
- Accesorios nuevos (gafas, moño, gorro) o SVG extra de loro.
- Sellos del mapa, temas de la app o fondos de pantalla.
- Vender, devolver o mezclar piezas de un look.
- Congelar racha u otros gastos que no sean looks.
- Dinero real, pagos o backend.
- Ruta nueva (`/looks`) o pestañas Recargar | Looks.
- Exportar/importar progreso.
- Escribir las misiones 5–12.

## Modelo de datos

```ts
// src/lib/progress/types.ts
export type CocoLookId = 'classic' | 'ocean' | 'sunset' | 'night' | 'party';

export type LooksState = {
  owned: CocoLookId[]; // solo looks de pago; classic no se guarda
  equipped: CocoLookId;
};

export type Progress = {
  version: 6;
  coins: number;
  missions: Record<string, MissionProgress>;
  reviews: Record<string, ReviewCard>;
  streak: StreakState;
  shop: ShopState;
  looks: LooksState;
};
```

```ts
// src/features/shop/content/coco-looks.ts
export type CocoLook = {
  id: CocoLookId;
  name: string;
  price: number; // 0 = classic
  shirt: string;
  hair: string;
  background: string;
};

export const COCO_LOOKS: CocoLook[] = [
  { id: 'classic', name: 'Coco clásico', price: 0, shirt: '#facc15', hair: '#dc2626', background: '#dcfce7' },
  { id: 'ocean', name: 'Océano', price: 25, shirt: '#0d9488', hair: '#1d4ed8', background: '#e0f2fe' },
  { id: 'sunset', name: 'Atardecer', price: 40, shirt: '#f97316', hair: '#7c3aed', background: '#ffedd5' },
  { id: 'night', name: 'Noche', price: 60, shirt: '#1e3a8a', hair: '#fbbf24', background: '#e2e8f0' },
  { id: 'party', name: 'Fiesta', price: 80, shirt: '#db2777', hair: '#06b6d4', background: '#fce7f3' },
];
```

Convenciones:

- Clave de localStorage: `english-mission:progress:v6`. Migra v5–v1 agregando `looks` vacío y borra las claves viejas.
- Estado inicial: `{ owned: [], equipped: "classic" }`. `resetProgress` vuelve a Coco clásico porque `emptyProgress` ya lo incluye.
- `classic` siempre se considera poseído; no entra en `owned`.
- Validador `isLooksState`: `owned` es un array sin duplicados de ids de pago (`ocean` | `sunset` | `night` | `party`); `equipped` es un `CocoLookId`; si `equipped !== "classic"`, ese id está en `owned`. `isProgress` exige `version === 6`.
- Lógica pura en `src/lib/progress/looks.ts`:
  - `LOOK_PRICES` y `PAID_LOOK_IDS`.
  - `isOwned(looks, id): boolean` — `true` si `id === "classic"` o si está en `owned`.
  - `canBuy(looks, coins, id): boolean` — no poseído, `price > 0` y `coins >= price`.
  - `nextLooks(looks, id): LooksState` — si ya es poseído, solo cambia `equipped`; si no, agrega `id` a `owned` y lo equipa.
- En el store (`progress-store.ts`): `selectLook(id): boolean` — una sola mutación. Si ya es poseído, solo equipa. Si no y `canBuy`, resta `price` a `coins` y aplica `nextLooks`. Si no alcanza el saldo, no muta y devuelve `false`. No llama a `spendCoins` por separado.
- `CharacterAvatar` con `character === "coco"` aplica `shirt` / `hair` / `background` del look. Prop opcional `lookId` para el preview del catálogo; si no hay `lookId`, usa `progress.looks.equipped`. El resto del elenco no cambia.
- La piel (`skin: "#1f9d55"`) no se pisa.
- Comprar o equipar no marca racha ni toca `reviews` ni el cupo de recarga.

## Plan de implementación

### Grupo 1 — Progreso v6 y `selectLook`

- [x] 1.1 En `src/lib/progress/types.ts`: agregar `CocoLookId`, `LooksState` y `looks` a `Progress`, subir `version` a `6`.
- [x] 1.2 Crear `src/lib/progress/looks.ts` con `LOOK_PRICES`, `PAID_LOOK_IDS`, `isOwned`, `canBuy` y `nextLooks`. Test unitario en `looks.test.ts`: `classic` siempre poseído; `canBuy` falso si ya es poseído, si el precio es 0 o si no alcanza el saldo; `nextLooks` de un look nuevo lo agrega a `owned` y lo equipa; reequipar uno poseído solo cambia `equipped`.
- [x] 1.3 En `src/lib/progress/progress-store.ts`: key `english-mission:progress:v6`, validador `isLooksState`, migraciones v5/v4/v3/v2/v1 → v6 con `looks` vacío, `selectLook(id)` en una sola mutación (equipar gratis si ya es poseído; si no, restar precio + `nextLooks`; sin saldo no muta y devuelve `false`), y `emptyProgress` con Coco clásico. Ampliar `progress-store.test.ts`: migrar v5 conserva monedas, misiones, repaso, racha y tienda y agrega `looks`; comprar `ocean` resta 25 y equipa; reequipar `classic` no toca monedas; saldo insuficiente no muta; reset deja `looks` vacío.

### Grupo 2 — Catálogo y avatar de Coco

- [x] 2.1 Crear `src/features/shop/content/coco-looks.ts` con `COCO_LOOKS` (nombres, hex y `price` tomado de `LOOK_PRICES`). Test unitario: 5 entradas, `classic` a precio 0, los 4 de pago coinciden con `LOOK_PRICES`, hex de `classic` iguales a `CHARACTERS.coco`.
- [x] 2.2 En `src/features/mission/components/character-avatar.tsx`: prop opcional `lookId`. Si `character === "coco"`, pisa `shirt` / `hair` / `background` con ese look; si no hay `lookId`, usa `progress.looks.equipped`. El resto del elenco no cambia. Ampliar `character-avatar.test.tsx`: Coco con `lookId="ocean"` usa los hex de Océano; sin `lookId` y look equipado `party` usa Fiesta; Marta no cambia.

### Grupo 3 — Catálogo en `/shop`

- [x] 3.1 En `shop-session.tsx`: catálogo debajo de la recarga, siempre visible salvo `phase === "playing"`. Cada tarjeta: `CharacterAvatar` con `lookId` de preview, nombre, precio, botón “Equipado” (deshabilitado) / “Usar” / “Comprar · N” (deshabilitado sin saldo). Sin misión completada se ve el estado vacío de recarga **y** el catálogo. `PageHeader` pasa a título “Tienda” y descripción que cubre recarga y looks.
- [x] 3.2 En `src/app/(app)/shop/page.tsx`: metadata `title: "Tienda · English Mission"`.
- [x] 3.3 Ampliar `shop-session.test.tsx`: catálogo visible sin misiones; con 25 monedas, Comprar Océano deja saldo 0 y botón “Equipado”; Usar en Clásico reequipa sin cambiar saldo; Comprar Fiesta con 25 monedas queda deshabilitado; durante el ejercicio el catálogo no se renderiza; comprar no toca `reviews` ni la racha ni el cupo de recarga.

## Criterios de aceptación

- [x] Con progreso v5 en localStorage, abrir la app conserva monedas, misiones, repaso, racha y tienda, y deja `looks: { owned: [], equipped: "classic" }` en `english-mission:progress:v6` (test unitario).
- [x] La migración desde v4, v3, v2 y v1 también produce v6 con looks vacíos (test unitario).
- [x] `isOwned` es verdadero para `classic` aunque `owned` esté vacío (test unitario).
- [x] `canBuy` es falso si el look ya es poseído, si el precio es 0 o si `coins < price` (test unitario).
- [x] `nextLooks` de un look nuevo lo agrega a `owned` y lo deja en `equipped` (test unitario).
- [x] `nextLooks` de un look ya poseído solo cambia `equipped` (test unitario).
- [x] `selectLook("ocean")` con 25 monedas deja saldo 0, `owned: ["ocean"]` y `equipped: "ocean"` (test unitario).
- [x] `selectLook("classic")` con Océano poseído no cambia monedas y deja `equipped: "classic"` (test unitario).
- [x] `selectLook("party")` con 25 monedas devuelve `false` y no muta (test unitario).
- [x] Reiniciar progreso deja `looks` vacío y Coco clásico (test unitario).
- [x] `COCO_LOOKS` tiene 5 entradas; `classic` cuesta 0; Océano/Atardecer/Noche/Fiesta cuestan 25/40/60/80 (test unitario).
- [x] Coco con `lookId="ocean"` pinta los hex de Océano; Marta no cambia (test de componente).
- [x] `/shop` sin misiones completadas muestra el estado vacío de recarga y el catálogo de looks (test de componente).
- [x] Con 25 monedas, Comprar Océano deja el botón de esa tarjeta en “Equipado” y el saldo en 0, persistido (test de componente).
- [x] Usar en Coco clásico lo reequipa sin cambiar el saldo (test de componente).
- [x] Comprar Fiesta con 25 monedas está deshabilitado (test de componente).
- [x] Durante el ejercicio de recarga el catálogo no se muestra (test de componente).
- [x] Comprar un look no crea tarjetas de `reviews`, no marca la racha y no consume cupo de recarga (test de componente).
- [x] El header de `/shop` muestra el título “Tienda” (test de componente).
- [x] `pnpm lint`, `pnpm exec tsc --noEmit` y `pnpm test` pasan.

## Decisiones

- **Sí:** solo looks de Coco. Un solo avatar se pisa; el elenco no se toca.
- **No:** ropa de Marta, Nico u otros. Multiplica catálogo, SVG y tests.
- **Sí:** looks de color (camisa, cresta, fondo). `ParrotBody` ya pinta esos campos.
- **No:** accesorios nuevos de loro. Exigen SVG extra y no están en el cuerpo actual.
- **Sí:** comprar = equipar. Un look a la vez. Lo comprado queda en `owned` y reequipar cuesta 0.
- **No:** pagar otra vez al volver a un look anterior. Castiga explorar el catálogo.
- **Sí:** `classic` siempre poseído y fuera de `owned`. La migración arranca vacía sin casos especiales.
- **Sí:** catálogo en la misma `/shop`, recarga arriba y looks abajo. Sin ruta nueva ni pestañas.
- **No:** `/looks` ni tabs Recargar | Looks. Más chrome para un catálogo de 5 tarjetas.
- **Sí:** catálogo visible sin misión completada. No necesita vocabulario; la recarga sí sigue bloqueada.
- **No:** bloquear toda la tienda hasta completar una misión. El usuario vería “Tienda” y nada que comprar con las monedas que ya tenga.
- **Sí:** header “Tienda”. La nav del shell ya usa esa palabra.
- **No:** dejar “Tienda de monedas”. Describe solo la recarga.
- **Sí:** precios 25/40/60/80. Un día de recarga (30) no alcanza el segundo look; hay que jugar o recargar más.
- **No:** looks a 15 o a 120. Demasiado barato vacía el sink; demasiado caro deja el catálogo muerto con 4 misiones.
- **Sí:** progreso v6 y `selectLook` en una sola mutación. Evita restar monedas y fallar el look.
- **No:** encadenar `spendCoins` + otra mutación. Dos escrituras, estado a medias si la segunda falla.
- **Sí:** `LOOK_PRICES` en `src/lib/progress/looks.ts` y nombres/hex en `src/features/shop/content/coco-looks.ts`. El store no importa features.
- **Sí:** `CharacterAvatar` lee el look equipado y acepta `lookId` para el preview del catálogo.
- **Sí:** ocultar el catálogo mientras `phase === "playing"`. El ejercicio de recarga no compite con las tarjetas.
- **No:** vender, devolver o mezclar piezas. Un look es atómico.
- **No:** congelar racha, dinero real, sellos del mapa ni misiones 5–12. Siguen fuera, como en el spec 03.

## Riesgos

| Riesgo                                                  | Mitigación                                                                                                                             |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Doble clic en Comprar cobra dos veces                   | `selectLook` es la única mutación: si ya es poseído, el segundo clic solo equipa y no resta monedas.                                   |
| Saldo justo y pista de misión a la vez                  | `selectLook` no muta si `coins < price`. Las pistas siguen usando `spendCoins` aparte; no se mezclan.                                  |
| Hydration: Coco clásico en servidor y Océano en cliente | `useProgress` ya usa `emptyProgress` como snapshot de servidor. El mismo patrón que el chip de monedas; un frame de clásico se acepta. |
| Hex de `classic` distinto de `CHARACTERS.coco`          | Test de `coco-looks.ts` exige igualdad. El avatar sin `lookId` y con `classic` pinta lo mismo.                                         |
| `owned` corrupto o `equipped` de un look no poseído     | `isLooksState` rechaza el progreso y arranca limpio, igual que tienda y racha.                                                         |
| Catálogo visible sin misión y 0 monedas                 | Botones Comprar deshabilitados. La recarga sigue pidiendo completar una misión.                                                        |
| SPAINISM en nombres o copy                              | Los nombres Océano / Atardecer / Noche / Fiesta son neutros. El test de curriculum sigue barriendo `src/`.                             |

## Lo que **no** entra en esta spec

- Looks o ropa del resto del elenco.
- Accesorios nuevos (gafas, moño, gorro) o SVG extra de loro.
- Sellos del mapa, temas de la app o fondos de pantalla.
- Vender, devolver o mezclar piezas de un look.
- Congelar racha u otros gastos que no sean looks.
- Dinero real, pagos o backend.
- Ruta `/looks` o pestañas Recargar | Looks.
- Exportar/importar progreso.
- Escribir las misiones 5–12.

Cada uno, si entra, va en su propia spec.
