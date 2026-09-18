# SPEC 05 — Práctica libre en el cuaderno

> **Estado:** Implementado
> **Depende de:** 01 — Repaso espaciado; 04 — Looks de Coco (progreso v6)
> **Fecha:** 2026-09-18
> **Objetivo:** Practicar cualquier palabra vista desde `/notebook` con un reto suelto que no altera el repaso, la racha ni las monedas, incluido un reto de dictado.

## Alcance

**Dentro:**

- Botón "Practicar" en cada palabra del cuaderno (solo palabras de misiones completadas, las que ya lista hoy).
- Puntos de dominio por palabra: caja 1, 2 o 3 leída de `progress.reviews[key]`; sin tarjeta se muestra caja 1.
- La fila deja de ser un solo botón anidado: escuchar y practicar pasan a ser dos acciones separadas.
- Sesión de práctica inline en `/notebook`, de un solo reto, construida al momento con `buildPracticeChallenge` según la caja:
  - Caja 1 → `choice` (español → inglés, 3 opciones).
  - Caja 2 → `type`.
  - Caja 3 → dictado (escuchar y escribir) si hay voz disponible; si no, `type`.
- Dictado: botón de reproducir (sin autoplay), escribir lo oído y comprobar con `checkTypedAnswer`.
- Perfil de dificultad de la palabra: `profileFor(word.level)`; intentos antes de revelar y tolerancia de typos salen de ahí.
- Pista gratis, `rewardsEnabled: false`, `coins: 0`, `onSpendCoins` que siempre falla.
- Al resolver: feedback normal del reto y botón "Continuar" que vuelve a la lista del cuaderno.
- Fallar o revelar no muta nada: la práctica se puede repetir sin costo.
- Tests unitarios de la construcción del reto y test de componente del flujo.

**Fuera de alcance (para specs futuros):**

- Que la práctica mueva cajas, marque racha o pague monedas.
- Dictado en repaso o en misiones (toca el spec 01).
- Tandas de 5 o de 10 retos.
- Ruta nueva `/notebook/practice` o modal sobre la lista.
- Practicar palabras de misiones no completadas.
- Reproducción automática al abrir el dictado.
- Un tipo nuevo en la unión `Challenge` o en los beats del currículo.
- Exportar/importar progreso.
- Backend, cuentas o sincronización (Supabase/InsForge).
- Escribir las misiones 5–12.

## Modelo de datos

Esta spec **no agrega datos persistentes**. `Progress` se queda en `version: 6`, la clave `english-mission:progress:v6` no cambia y no hay migración.

Lo único nuevo es un tipo de runtime para armar el reto:

```ts
// src/shared/lib/review/review-exercise.ts
export type PracticeChallenge = {
  challenge: Challenge; // reto listo para el componente compartido
  speakText: string | null; // palabra a reproducir en el dictado; null en choice/type
};

export function buildPracticeChallenge(
  word: ReviewWord & { box: ReviewBox },
  pool: ReviewWord[],
  speechAvailable: boolean
): PracticeChallenge;
```

Convenciones:

- La caja se lee de `progress.reviews[reviewKey(en)]?.box ?? 1`; nunca se escribe de vuelta.
- El pool es `buildReviewPool(progress)`, el mismo del repaso; los distractores siguen saliendo de ahí.
- El perfil de dificultad es `profileFor(word.level)`.
- El dictado se modela como un `TypeChallenge` normal más `speakText`; no se agrega ningún `kind` nuevo a la unión `Challenge` ni a los beats.
- Si el pool no alcanza 2 opciones, la caja 1 cae a `type` (mismo fallback que repaso).
- La sesión guarda en estado local solo la palabra elegida; al salir se pierde.

## Plan de implementación

### Grupo 1 — Builder de práctica (capa compartida)

- [x] 1.1 En `src/shared/lib/review/review-exercise.ts`: agregar `PracticeChallenge` y `buildPracticeChallenge(word, pool, speechAvailable)`. Caja 1 → `choice` con fallback a `type` si el pool no da 2 opciones; caja 2 → `type`; caja 3 → dictado (`type` con `speakText` y prompt "Escucha y escribe en inglés.") si hay voz, si no `type`. Reutiliza `buildOptions`, `typeChallenge` y su hint. Ampliar `review-exercise.test.ts`: caja 1 con pool suficiente arma `choice` con `correct` correcto y `speakText: null`; caja 1 con pool corto cae a `type`; caja 2 arma `type`; caja 3 con voz arma `type` con `speakText === word.en`; caja 3 sin voz arma `type` con `speakText: null`; `accepted` siempre contiene `word.en`.

### Grupo 2 — Sesión y fila del cuaderno

- [x] 2.1 Crear `src/features/mission/components/notebook-practice.tsx`: recibe la palabra (`ReviewWord` + `box`), el `pool` y `onExit`; construye el reto con `buildPracticeChallenge` y lo renderiza con `ChoiceChallenge` o `TypeChallenge` (`coins: 0`, `rewardsEnabled: false`, `freeHints: true`, `onSpendCoins: () => false`, `profile: profileFor(word.level)`, `onSolved` que marca la sesión como resuelta para mostrar "Continuar", `onContinue: onExit`). Si `speakText` no es null, muestra botón "Escuchar" (`SpeakerHigh` + `speak(speakText)`) encima del reto.
- [x] 2.2 En `notebook.tsx`: la fila pasa a dos acciones separadas (Escuchar y Practicar) sin anidar botones, más tres puntos de dominio (`progress.reviews[reviewKey(en)]?.box ?? 1`, con `aria-label` de caja). Estado local con la palabra en práctica: mientras exista, se renderiza `NotebookPractice` en lugar de las secciones. Practicar no escribe en `progress`.
- [x] 2.3 Ampliar `notebook.test.tsx`: palabra sin tarjeta muestra caja 1 y con tarjeta caja 3 muestra los 3 puntos; Practicar abre el reto de esa palabra; resolver muestra "Continuar" y Continuar vuelve a la lista; revelar no crea ni modifica `reviews`, ni monedas, ni racha; con voz, el dictado muestra "Escuchar", y sin voz no aparece y el reto es `type`.

## Criterios de aceptación

- [x] Caja 1 con pool suficiente devuelve `kind: "choice"`, `speakText: null` y `correct` apuntando a `word.en` (test unitario).
- [x] Caja 1 con pool de una sola palabra cae a `kind: "type"` (test unitario).
- [x] Caja 2 devuelve `kind: "type"` con `speakText: null` (test unitario).
- [x] Caja 3 con voz devuelve `kind: "type"` y `speakText === word.en` (test unitario).
- [x] Caja 3 sin voz devuelve `kind: "type"` y `speakText: null` (test unitario).
- [x] En todos los casos `accepted` contiene `word.en` (test unitario).
- [x] El cuaderno pinta 1 punto de dominio para una palabra sin tarjeta y 3 para una con caja 3, con `aria-label` que menciona la caja (test de componente).
- [x] Practicar abre el reto de esa palabra y oculta la lista del cuaderno (test de componente).
- [x] Resolver el reto muestra "Continuar" y Continuar vuelve a la lista (test de componente).
- [x] Resolver o revelar la práctica no crea ni modifica tarjetas de `reviews`, ni cambia `coins` ni `streak` (test de componente).
- [x] Con voz soportada, la práctica de caja 3 muestra el botón "Escuchar" y pulsarlo llama a `speak` con la palabra (test de componente).
- [x] Sin voz soportada, la práctica de caja 3 no muestra "Escuchar" y el reto es de escribir (test de componente).
- [x] La práctica usa el perfil del nivel de la palabra: con nivel 5 avisa que quedan 2 intentos (test de componente).
- [x] `pnpm lint`, `pnpm exec tsc --noEmit` y `pnpm test` pasan.

## Decisiones

- **Sí:** práctica desde el cuaderno, de un solo reto. Resuelve "quiero practicar esta palabra ya" sin estado de sesión extra.
- **No:** tandas de 5 o 10 retos. Más UI y estado; el repaso diario ya cubre sesiones.
- **Sí:** la práctica no muta nada: ni cajas, ni racha, ni monedas. El Leitner y sus premios quedan para misión y repaso, y no hay farmeo posible.
- **No:** mover cajas al practicar. Repetir la misma palabra hasta acertar inflaría el dominio sin mérito.
- **No:** marcar racha al practicar. Reabre las reglas del spec 02 y permitiría racha diaria sin repasar.
- **Sí:** dictado solo en práctica, en caja 3 y con voz disponible. Aporta un ejercicio nuevo sin tocar el spec 01.
- **No:** dictado en repaso o misiones. Cambiaría el comportamiento de la caja 3 y obligaría a revisar el spec 01.
- **Sí:** dictado modelado como `type` + `speakText`, no como `kind` nuevo. Evita tocar la unión `Challenge`, los beats y `curriculum.test.ts`.
- **No:** `kind: "dictation"`. Ripple por tipos, perfiles de nivel y validaciones de currículo sin ganancia.
- **Sí:** fallback a `type` sin voz o con pool insuficiente. SpeechSynthesis no existe en todos los navegadores.
- **Sí:** perfil del nivel de la palabra (`profileFor(word.level)`). Misma dificultad que el repaso.
- **Sí:** pistas gratis y sin monedas, como en repaso. Practicar es para aprender, no para cobrar.
- **No:** autoplay del dictado. Respeta la política del proyecto de audio solo con gesto del usuario; el botón "Escuchar" es ese gesto.
- **Sí:** sesión inline en `/notebook`. Sin ruta nueva ni modal; menos piezas y sin deep links que nadie usa.
- **No:** ruta `/notebook/practice` o modal. Churn de chrome y de tests.
- **Sí:** tres puntos de dominio en la fila, leídos de la caja real. Hace visible lo que el Leitner ya guarda, sin datos nuevos.
- **No:** calificar el dominio con aciertos de práctica. La caja es la única fuente y no se toca.
- **Sí:** dos acciones separadas en la fila (Escuchar, Practicar). El botón anidado actual es HTML inválido.
- **No:** menú al tocar la palabra. Un toque extra para escuchar sin ganancia.
- **Sí:** cero persistencia nueva, progreso v6 sin migración. La práctica no guarda nada.
- **No:** contadores de práctica por palabra. Dato que nadie consume todavía.
- **No:** export/import, Supabase/InsForge, misiones 5–12 o congelar racha. Siguen fuera, como en specs 03 y 04.

## Riesgos

| Riesgo                                                    | Mitigación                                                                                                                |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| El usuario espera que practicar suba el dominio y no pasa | Los puntos de dominio se leen de la caja real; la práctica nunca la escribe. Decisión documentada, no efecto colateral.   |
| SpeechSynthesis ausente o bloqueado                       | `buildPracticeChallenge` cae a `type` sin `speakText`; el botón "Escuchar" ni se renderiza. El reto sigue siendo jugable. |
| Voz en inglés inexistente en el dispositivo               | `pickVoice` ya cae a la primera voz `en` o a la del sistema; el dictado suena con lo que haya.                            |
| Palabras multipalabra ("nice to meet you") en dictado     | `checkTypedAnswer` compara palabra a palabra con tolerancia; `accepted` contiene la frase completa.                       |
| Cuaderno se reescribe y rompe estilos o área táctil       | Fila con dos botones separados, ambos `min-h-11` y con `aria-label`; sin anidar interactivos.                             |
| Dos retos montados a la vez con `id="challenge-form"`     | La sesión reemplaza la lista y solo monta un reto; no hay formularios simultáneos.                                        |
| Puntos de dominio con progreso corrupto                   | El validador de `progress-store` ya descarta progreso inválido; sin tarjeta se pinta caja 1.                              |
| Copy nuevo con regionalismos                              | El test de currículo barre todo `src/` buscando Spainisms; el copy se escribe en español neutro.                          |
| Duplicar lógica de opciones entre repaso y práctica       | `buildPracticeChallenge` reutiliza `buildOptions` y `typeChallenge`; una sola fuente para armado de retos.                |

## Lo que **no** entra en esta spec

- Que la práctica mueva cajas, marque racha o pague monedas.
- Dictado en repaso o en misiones.
- Tandas de 5 o de 10 retos.
- Ruta nueva `/notebook/practice` o modal.
- Practicar palabras de misiones no completadas.
- Reproducción automática del dictado.
- Un `kind` nuevo en la unión `Challenge` o en los beats.
- Exportar/importar progreso.
- Backend, cuentas o sincronización (Supabase/InsForge).
- Escribir las misiones 5–12.

Cada uno, si entra, va en su propia spec.
