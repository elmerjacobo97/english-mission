# SPEC 15 — Panel de progreso y protector de racha

> **Estado:** Implementado
> **Depende de:** SPEC 02 — Racha diaria; SPEC 03 — Tienda de monedas; SPEC 06 — Progreso en Supabase; SPEC 11 — Rutas de aprendizaje por nivel CEFR
> **Fecha:** 2026-09-24
> **Objetivo:** Mostrar el avance ya guardado y vender un protector de racha que cubre los días saltados si alcanzan al volver a jugar.

## Alcance

**Dentro:**

- Ruta `/progress`, abierta desde el chip de racha del header. El chip sigue mostrando solo los días de racha. No se agrega un destino a la navegación.
- En el panel: racha actual, récord y protectores guardados. Palabras por caja del repaso (1, 2 y 3) y cuántas están pendientes hoy. Misiones completadas por banda CEFR. La banda elegida va primero. Las otras siguen visibles.
- Protector en `/shop`, a 20 monedas, con un máximo de 2 guardados. Comprar no cuenta como actividad del día. Se puede comprar con monedas aunque no haya misiones completadas. El botón queda deshabilitado sin monedas suficientes o con 2 ya guardados.
- Al completar una misión o responder un repaso, si faltan días y los protectores alcanzan para cada día saltado, se gastan y la racha suma 1. Si no alcanzan, la racha vuelve a 1 y no se gasta ninguno. Con la racha en 0 no se gasta nada. El mismo día no cambia la racha. Un protector no sustituye la actividad de hoy.
- Aviso en el mapa cuando se gasta al menos un protector. Se cierra una vez, igual que el aviso de hitos.

**Fuera de alcance:**

- Minutos por semana o medir la duración de una sesión.
- Notificaciones, recordatorios o push.
- Looks, fondos u otros gastos nuevos en la tienda.
- Activar el protector a medianoche, sin volver a jugar.
- Mostrar los protectores en el chip del header.
- Voz, micrófono o pronunciación.
- Cambiar hitos de monedas, cupo de recargas o looks que ya existen.

## Modelo de datos

El panel no guarda nada nuevo. Lee la racha, las tarjetas de `reviews` y las misiones completadas. El protector sí amplía la racha. El progreso pasa a la versión 8.

```ts
export type StreakState = {
  current: number;
  best: number;
  lastDay: string | null; // YYYY-MM-DD local
  pendingMilestone: 3 | 7 | 30 | null;
  freezes: number; // 0 a 2
  pendingFreezesUsed: number; // 0 si no hay aviso; 1 o 2 si hay que avisar
};

export type Progress = {
  version: 8;
  // el resto no cambia
  streak: StreakState;
};
```

En `streak_state` se agregan dos columnas. Las filas que ya existen quedan en 0.

- `freezes integer not null default 0 check (freezes between 0 and 2)`
- `pending_freezes_used smallint not null default 0 check (pending_freezes_used between 0 and 2)`

Constantes en `src/shared/lib/progress/streak.ts`: precio 20 y máximo 2.

### Reglas

1. Comprar descuenta 20 monedas y suma 1 a `freezes`. Falla si hay menos de 20 monedas o si ya hay 2. No cambia `lastDay` ni `current`.
2. El mismo día de `lastDay` no cambia la racha ni gasta protectores.
3. Si `lastDay` es el día anterior, `current` suma 1 y no se gasta ningún protector.
4. Los días saltados son los que quedan entre `lastDay` y hoy, sin contar hoy. Lunes a miércoles salta un día. Lunes a jueves salta dos.
5. Si `current` es mayor que 0 y los protectores alcanzan para cada día saltado, se restan esos protectores, `current` suma 1 y `pendingFreezesUsed` queda en la cantidad gastada.
6. Si no alcanzan, `current` vuelve a 1, `freezes` no cambia y `pendingFreezesUsed` queda en 0.
7. Con `current` en 0 no se gasta ningún protector. La primera actividad deja la racha en 1.
8. Los hitos de 3, 7 y 30 días se pagan igual que ahora, también si ese día se usó un protector.
9. Cerrar el aviso del mapa pone `pendingFreezesUsed` en 0. Reiniciar el progreso borra la racha, incluidos los protectores.

## Plan de implementación

### Grupo 1 — Protector en la racha

- [x] 1.1 Agregar `freezes` y `pending_freezes_used` a `streak_state` en una migración nueva. No aplicarla con `supabase db push` salvo que se pida.
- [x] 1.2 Extender `StreakState`, `emptyProgress` y los mappers en `src/shared/lib/progress/`. Si la columna todavía no viene, leer 0. El progreso queda en versión 8.
- [x] 1.3 Implementar el gasto en `nextStreak`, con precio 20 y máximo 2. Cubrir en `streak.test.ts` el mismo día, el día seguido, un día cubierto, dos días cubiertos, días de más sin gastar y la racha en 0.

### Grupo 2 — Compra en la tienda

- [x] 2.1 Agregar `buyStreakFreeze` en `src/shared/lib/progress/progress-store.ts`. Descuenta 20 monedas y suma un protector en un solo sync. No cambia `lastDay` ni `current`.
- [x] 2.2 Mostrar en `src/features/shop/components/shop-session.tsx` el botón «Proteger racha». Deshabilitarlo sin 20 monedas o con 2 ya guardados, aunque no haya misiones completadas.
- [x] 2.3 Probar en el store la compra, el tope de 2 y el saldo insuficiente.

### Grupo 3 — Aviso en el mapa

- [x] 3.1 Mostrar en el mapa un aviso cuando `pendingFreezesUsed` es 1 o 2: «Usamos un protector. Tu racha sigue.» o «Usamos 2 protectores. Tu racha sigue.».
- [x] 3.2 Cerrar el aviso pone `pendingFreezesUsed` en 0, igual que el hito de monedas. Puede convivir con ese hito.
- [x] 3.3 Probar que el aviso aparece al volver con un día cubierto y desaparece al cerrarlo.

### Grupo 4 — Panel de progreso

- [x] 4.1 Crear `/progress` con `PageHeader`. Mostrar racha, récord, protectores, palabras por caja, pendientes de hoy y misiones completadas por banda con `courseEntries`. La banda elegida va primero.
- [x] 4.2 Convertir el chip de racha del header en un enlace a `/progress`. El chip sigue mostrando solo los días.
- [x] 4.3 Probar el panel vacío, con palabras en las tres cajas y con misiones en más de una banda.

## Criterios de aceptación

- [x] El chip de racha enlaza a `/progress` y muestra solo los días, no los protectores.
- [x] La navegación principal no agrega un destino nuevo.
- [x] `/progress` muestra la racha actual, el récord y los protectores guardados.
- [x] `/progress` cuenta las palabras en las cajas 1, 2 y 3, y cuántas están pendientes hoy.
- [x] `/progress` muestra las misiones completadas de cada banda CEFR. La banda elegida aparece primero. Las otras siguen visibles.
- [x] En `/shop`, «Proteger racha» cuesta 20 monedas y permite guardar hasta 2.
- [x] El botón se puede usar con monedas aunque no haya misiones completadas.
- [x] El botón queda deshabilitado con menos de 20 monedas o con 2 protectores ya guardados.
- [x] Comprar descuenta 20 monedas, suma un protector y no cambia el día ni el número de la racha.
- [x] Completar una misión o responder un repaso el día siguiente suma 1 a la racha y no gasta protectores.
- [x] Si falta un día y hay al menos un protector, se gasta uno, la racha suma 1 y el mapa avisa «Usamos un protector. Tu racha sigue.».
- [x] Si faltan dos días y hay dos protectores, se gastan los dos, la racha suma 1 y el mapa avisa «Usamos 2 protectores. Tu racha sigue.».
- [x] Si los protectores no alcanzan para todos los días saltados, la racha vuelve a 1 y no se gasta ninguno.
- [x] Con la racha en 0, la primera actividad la deja en 1 y no gasta protectores.
- [x] Cerrar el aviso del mapa lo oculta y no vuelve a aparecer al recargar.
- [x] Un día que llega a 3, 7 o 30 sigue pagando su hito, aunque ese día se haya usado un protector.
- [x] Reiniciar el progreso deja los protectores en 0.

## Decisiones

- **Sí:** una sola spec para el panel y el protector. Se leen juntos y el protector aparece en el panel.
- **Sí:** 20 monedas y máximo 2. Alcanza para cubrir un fin de semana corto sin volverlo gratis.
- **No:** 15 monedas con máximo 1, o 30 con máximo 3.
- **Sí:** al volver, se gastan solo si alcanzan para cada día saltado. Si no alcanzan, la racha vuelve a 1 y los protectores se conservan.
- **No:** gastarlos aunque no alcancen. Tampoco activarlos a mano antes de saltarse el día.
- **Sí:** el protector se aplica al completar una misión o responder un repaso. No corre a medianoche.
- **Sí:** `/progress` se abre desde el chip de racha. El chip muestra solo los días.
- **No:** un destino nuevo en la navegación, ni el panel incrustado en el mapa.
- **Sí:** el panel usa datos que ya existen: racha, protectores, cajas de repaso y misiones por banda CEFR.
- **No:** minutos por semana. Hoy no se guarda la duración de una sesión.
- **Sí:** aviso en el mapa al gastar protectores, cerrado una vez. Puede aparecer junto al hito de monedas.
- **No:** dejar el aviso solo en `/progress`.
- **Sí:** comprar con monedas aunque no haya misiones completadas, igual que los looks.
- **No:** exigir una misión completada, como la recarga.
- **Sí:** guardar `freezes` y `pendingFreezesUsed` en `streak_state`, y subir el progreso a la versión 8.
- **No:** una tabla nueva. El panel no persiste nada propio.

## Riesgos

| Riesgo                                                                                    | Mitigación                                                                      |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| La compra escribe `freezes` antes de aplicar la migración y el guardado falla.            | Leer 0 si la columna no viene. Aplicar la migración antes de usar la compra.    |
| Contar el hueco en horas cambia un día cuando entra o sale el horario de verano.          | Contar fechas de calendario con `previousDayKey`, no una resta de milisegundos. |
| La racha vuelve a 1 y los protectores siguen ahí, sin un aviso de por qué no se gastaron. | No agregamos otro aviso. `/progress` sigue mostrando los que quedaron.          |

## Lo que no entra en esta spec

- Minutos por semana o medir cuánto dura una sesión.
- Notificaciones, recordatorios o push.
- Looks, fondos u otros gastos nuevos en la tienda.
- Activar el protector a medianoche, sin volver a jugar.
- Mostrar los protectores en el chip del header.
- Voz, micrófono o pronunciación.
- Cambiar los hitos de monedas, el cupo de recargas o los looks que ya existen.
- Un aviso extra cuando la racha se rompe y los protectores se conservan.

Cada uno de esos puntos, si llega, va en su propia spec.
