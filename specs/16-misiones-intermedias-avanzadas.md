# SPEC 16 — Misiones intermedias y avanzadas

> **Estado:** Aprobado
> **Depende de:** SPEC 10 — Personajes y narrativa de misiones; SPEC 11 — Rutas de aprendizaje por nivel CEFR
> **Fecha:** 2026-09-24
> **Objetivo:** Publicar cuatro misiones fijas B1–B2 y las misiones 11–12, con un prompt de autor que solo produce borradores.

## Alcance

**Dentro:**

- Cuatro misiones nuevas en `plan.json`, entre `interview` y `first-day`. Situaciones: reunión, queja educada, plan con colegas y opinión. Banda `intermediate`, capítulo 3, nivel 4.
- Beats de esas cuatro, más los de `friends` y `new-home`, en `src/shared/lib/curriculum/missions/`. El elenco y el vocabulario de `friends` y `new-home` se quedan como están en el plan. Las cuatro nuevas pasan a `written: true`, igual que la 11 y la 12.
- Renumerar el orden: las cuatro nuevas ocupan 10–13. `first-day`, `friends` y `new-home` pasan a 14–16. Los slugs ya publicados no cambian.
- Reescribir los beats de `first-day` para que reciclen palabras introducidas por las cuatro misiones nuevas.
- Registrar los JSON nuevos en `mission-catalog.ts`. Ajustar `curriculum.test.ts` a 16 misiones seguidas y a cero misiones sin escribir.
- Un prompt de autor versionado en el repo. Un humano lo usa fuera del juego, revisa el borrador y solo entonces el JSON entra al currículo.

**Fuera de alcance:**

- Llamar al gateway, a OpenRouter o a cualquier modelo desde la app o desde un script del repo.
- Escribir o modificar `plan.json` o los beats sin revisión humana.
- Cambiar las misiones 1–8, el elenco, el desbloqueo por banda, el diagnóstico o el onboarding.
- Más misiones C1 aparte de `friends` y `new-home`.
- Voz, micrófono o retos de un tipo nuevo.

## Modelo de datos

No hay tablas ni versión nueva de `Progress`. El avance sigue por slug. `first-day`, `friends` y `new-home` conservan su slug.

Las cuatro entradas van en `src/shared/lib/curriculum/plan.json`, con la misma forma que `MissionPlanEntry`. Dos B1 y dos B2. Nivel 4, capítulo 3, banda `intermediate`, `written: true`.

```ts
// orden 10, cefrLevel B1
{ slug: "meeting", title: "La reunión", subtitle: "Acordar hora y tema", emoji: "📅",
  cast: [coco tutor, sofia primary],
  vocab: [["meeting","reunión"],["schedule","horario"],["topic","tema"],["agree","estar de acuerdo"],["time","hora"],["room","sala"],["notes","notas"]] }

// orden 11, cefrLevel B1
{ slug: "complaint", title: "La queja", subtitle: "Pedir un cambio con calma", emoji: "🗣️",
  cast: [coco tutor, sofia primary],
  vocab: [["problem","problema"],["delay","retraso"],["polite","educado"],["request","pedido"],["change","cambio"],["sorry","lo siento"],["solution","solución"]] }

// orden 12, cefrLevel B2
{ slug: "after-work", title: "El plan", subtitle: "Salir con el equipo", emoji: "🌆",
  cast: [coco tutor, tere primary, cami support],
  vocab: [["join","unirse"],["tonight","esta noche"],["restaurant","restaurante"],["maybe","tal vez"],["busy","ocupado"],["invite","invitar"],["later","más tarde"]] }

// orden 13, cefrLevel B2
{ slug: "opinion", title: "La opinión", subtitle: "Decir lo que piensas", emoji: "💬",
  cast: [coco tutor, sofia primary, tere support],
  vocab: [["opinion","opinión"],["think","pensar"],["disagree","discrepar"],["reason","razón"],["example","ejemplo"],["prefer","preferir"],["suggest","sugerir"]] }
```

`first-day` pasa a orden 14, `friends` a 15 y `new-home` a 16. Elenco y vocabulario de `friends` y `new-home` no cambian.

Cada misión escrita trae beats del tipo `Beat` que ya existe: de 8 a 16, al menos 3 retos del nivel 4 o 5, y al menos 2 notas gramaticales. El inglés de `first-day` usa al menos una palabra de cada una de las cuatro listas nuevas.

## Plan de implementación

### Grupo 1 — Prompt y huecos del plan

- [x] 1.1 Crear `src/shared/lib/curriculum/draft-mission-prompt.md`. El prompt pide beats de 8 a 16, vocabulario del plan, elenco declarado, español neutro y reciclaje. Dice que el borrador no se publica hasta revisión humana.
- [x] 1.2 Insertar `meeting`, `complaint`, `after-work` y `opinion` en `plan.json` con `written: false`. Pasar `first-day` al orden 14, `friends` al 15 y `new-home` al 16. Renombrar `mission-10-first-day.json` a `mission-14-first-day.json` y actualizar el import en `mission-catalog.ts`.
- [x] 1.3 Ajustar `curriculum.test.ts` a 16 misiones seguidas. Las no escritas quedan en los órdenes 10, 11, 12, 13, 15 y 16. `rtk pnpm test src/shared/lib/curriculum/curriculum.test.ts` pasa.

### Grupo 2 — La reunión

- [x] 2.1 Escribir `mission-10-meeting.json` y registrar el import. Marcar `meeting` como `written: true`.
- [x] 2.2 Quitar el orden 10 de las no escritas en el test. El test de currículo pasa.

### Grupo 3 — La queja

- [x] 3.1 Escribir `mission-11-complaint.json`, registrarlo y marcar `complaint` como `written: true`.
- [x] 3.2 Quitar el orden 11 de las no escritas. El test de currículo pasa.

### Grupo 4 — El plan

- [x] 4.1 Escribir `mission-12-after-work.json`, registrarlo y marcar `after-work` como `written: true`.
- [x] 4.2 Quitar el orden 12 de las no escritas. El test de currículo pasa.

### Grupo 5 — La opinión

- [x] 5.1 Escribir `mission-13-opinion.json`, registrarlo y marcar `opinion` como `written: true`.
- [x] 5.2 Quitar el orden 13 de las no escritas. El test de currículo pasa.

### Grupo 6 — El primer día

- [x] 6.1 Reescribir los beats de `mission-14-first-day.json` para usar al menos una palabra de cada lista nueva (`meeting`, `complaint`, `after-work`, `opinion`). No cambiar slug, elenco ni vocabulario de `first-day`.
- [x] 6.2 El test de currículo pasa, incluido el reciclaje de `first-day`.

### Grupo 7 — Hacer amigos

- [x] 7.1 Escribir `mission-15-friends.json` con el elenco y el vocabulario ya declarados. Registrarlo y marcar `friends` como `written: true`.
- [x] 7.2 Quitar el orden 15 de las no escritas. El test de currículo pasa.

### Grupo 8 — La casa nueva

- [x] 8.1 Escribir `mission-16-new-home.json` con el elenco y el vocabulario ya declarados. Registrarlo y marcar `new-home` como `written: true`.
- [x] 8.2 Dejar la lista de no escritas vacía. El test de currículo pasa.

## Criterios de aceptación

- [x] `plan.json` tiene 16 misiones con órdenes 1 a 16 y slugs únicos.
- [x] `meeting` y `complaint` están escritas, en banda `intermediate`, nivel 4, CEFR B1, órdenes 10 y 11.
- [x] `after-work` y `opinion` están escritas, en banda `intermediate`, nivel 4, CEFR B2, órdenes 12 y 13.
- [x] `first-day` sigue con slug `first-day`, orden 14, banda `advanced` y CEFR C1. Su inglés usa al menos una palabra de cada lista nueva: `meeting`, `complaint`, `after-work` y `opinion`.
- [x] `friends` y `new-home` están escritas en órdenes 15 y 16, con el mismo elenco y el mismo vocabulario que ya tenían en el plan.
- [x] No queda ninguna misión con `written: false`.
- [x] `rtk pnpm test src/shared/lib/curriculum/curriculum.test.ts` pasa, incluido vocabulario, reciclaje, elenco, notas y español neutro.
- [x] `src/shared/lib/curriculum/draft-mission-prompt.md` existe y dice que el borrador no entra al currículo sin revisión humana.
- [x] Ningún archivo nuevo llama al gateway, a OpenRouter ni a un modelo.
- [x] Los slugs `interview`, `first-day`, `friends` y `new-home` no cambian.

## Decisiones

- **Sí:** contenido fijo en JSON, más un prompt de autor en el repo. La IA solo redacta un borrador. Lo que se publica ya pasó revisión humana y el test de currículo.
- **No:** un script que llame al gateway o a OpenRouter. SPEC 08 dejó fuera generar el currículo automático, y esta spec no abre esa puerta.
- **No:** partir en dos specs. El prompt y las misiones se revisan juntos.
- **Sí:** cuatro misiones nuevas, no tres. La ruta intermedia queda con cinco misiones contando «La entrevista».
- **Sí:** insertarlas entre `interview` y `first-day`, y reescribir los beats de `first-day` para reciclar el vocabulario nuevo. El orden global sigue sin bajar de nivel ni de capítulo.
- **No:** pasar el reciclaje a «por banda». Habría cambiado la regla actual sin hacer falta.
- **No:** agregarlas al final en nivel 5. Obligaría a una misión B1–B2 a reciclar vocabulario C1.
- **Sí:** situaciones de trabajo: reunión, queja educada, plan con colegas y opinión. Dos B1 (`meeting`, `complaint`) y dos B2 (`after-work`, `opinion`).
- **No:** cita médica, trámite, viaje o desacuerdo con un amigo. Quedan para otra spec si hacen falta.
- **Sí:** escribir `friends` y `new-home` con el elenco y el vocabulario que ya están en el plan. Los slugs publicados no cambian, así que el progreso guardado sigue válido.
- **No:** versión nueva de `Progress` ni columnas nuevas. No hay estado de juego que guardar.

## Riesgos

| Riesgo                                                                                      | Mitigación                                                                                                         |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Reescribir `first-day` cambia una misión que ya se puede jugar.                             | No se tocan slug, elenco ni vocabulario. Solo se agregan palabras de las cuatro listas nuevas dentro de los beats. |
| El orden nuevo rompe el progreso guardado.                                                  | El progreso usa slug. `interview`, `first-day`, `friends` y `new-home` conservan el suyo.                          |
| Un borrador de IA mete regionalismos, vocabulario huérfano o retos de un nivel que no toca. | El prompt lo prohíbe. Nada se marca `written: true` si `curriculum.test.ts` falla.                                 |
| Renombrar `mission-10-first-day.json` deja un import viejo.                                 | El grupo 1 actualiza `mission-catalog.ts` en el mismo paso y el test de currículo tiene que pasar antes de seguir. |

## Qué no entra en esta spec

- Llamar al gateway, a OpenRouter o a un script que genere misiones.
- Publicar un borrador sin revisión humana.
- Cambiar las misiones 1–8, el elenco, el desbloqueo por banda, el diagnóstico o el onboarding.
- Más misiones C1 aparte de `friends` y `new-home`.
- Voz, micrófono o un tipo nuevo de reto.
- Cita médica, trámite, viaje o desacuerdo con un amigo.

Cada uno de esos puntos, si llega, va en su propia spec.
