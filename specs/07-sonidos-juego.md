# SPEC 07 — Sonidos de juego

> **Estado:** Implementado
> **Depende de:** SPEC 01 — Repaso espaciado; SPEC 03 — Tienda de monedas; SPEC 05 — Práctica libre
> **Fecha:** 2026-09-20
> **Objetivo:** Agregar efectos de sonido locales para aciertos, errores y final de misión, con control global de silencio que también gestione la voz existente.

## Alcance

**Dentro:**

- Crear capa compartida de audio en `src/shared/lib/audio.ts`.
- Integrar tres efectos MP3 locales:
  - `public/audio/correct.mp3`
  - `public/audio/incorrect.mp3`
  - `public/audio/mission-complete.mp3`
- Reproducir `correct.mp3` al resolver correctamente cualquier reto.
- Reproducir `incorrect.mp3` en cada respuesta incorrecta, incluida la que termina en revelación.
- Reproducir `mission-complete.mp3` al mostrar `MissionComplete`.
- Aplicar sonidos a misiones, repaso, tienda y práctica del cuaderno mediante el flujo compartido de retos.
- Agregar botón global de silencio en el header de `AppShell`.
- Iniciar audio activado por defecto.
- Mantener mute solo durante la sesión actual.
- Hacer que mute controle efectos y voz existente de `SpeechSynthesis`.
- Reproducir únicamente como consecuencia de una acción del usuario, sin autoplay al cargar rutas; el sonido de final puede iniciar al montar `MissionComplete` cuando ese montaje sucede después de resolver el último reto.
- Continuar la experiencia sin sonido si el navegador no soporta audio o un archivo falla.
- Agregar pruebas para reproducción, mute, integración de eventos y fallback silencioso.

**Fuera de alcance (para specs futuros):**

- Música ambiente o pistas en bucle.
- Nuevas voces grabadas o reemplazo de `SpeechSynthesis`.
- Sonidos para navegación, botones del shell o compras de looks.
- Control de volumen, mezclador o ajustes avanzados.
- Persistir preferencia de audio en Supabase o agregar columnas/tablas.
- Audio servido desde CDN, Supabase Storage o proveedor externo.
- Uso de Web Audio API para generar tonos.
- Autoplay de efectos o música sin una acción previa del usuario.

## Modelo de datos

Esta spec no agrega datos persistentes. `Progress` conserva versión 6 y Supabase no cambia.

La capa de audio agrega únicamente estado en memoria durante sesión:

```ts
// src/shared/lib/audio.ts
export type SoundEffect = 'correct' | 'incorrect' | 'mission-complete';

export type AudioState = {
  muted: boolean;
};

export const AUDIO_FILES = {
  correct: '/audio/correct.mp3',
  incorrect: '/audio/incorrect.mp3',
  missionComplete: '/audio/mission-complete.mp3',
} as const;
```

Convenciones:

- `muted` inicia en `false`.
- Recargar página restablece `muted` a `false`.
- `SoundEffect` solo contiene los tres efectos de esta spec.
- Fallos de carga o reproducción no cambian progreso ni bloquean retos.
- `SpeechSynthesis` consulta el mismo estado `muted`.
- No se agregan tablas, columnas, migraciones ni campos a `Progress`.

## Plan de implementación

### Grupo 1 — Núcleo de audio y assets

- [x] 1.1 Seleccionar los tres efectos desde Kenney UI Audio, con licencia CC0, o generar efectos originales si no encajan; guardarlos con los nombres definidos en `public/audio/` y registrar su procedencia en `public/audio/README.md`.
- [x] 1.2 Crear `src/shared/lib/audio.ts` con `SoundEffect`, `AUDIO_FILES`, estado `muted` en memoria y suscripción compatible con `useSyncExternalStore`.
- [x] 1.3 Implementar `playSound`, `isMuted`, `setMuted` y `toggleMuted` usando `HTMLAudioElement`; detener cualquier efecto activo al activar mute y absorber fallos de reproducción.
- [x] 1.4 Crear `src/shared/lib/audio.test.ts` para estado inicial, rutas de assets, reproducción, mute, detención y fallback silencioso.

### Grupo 2 — Feedback de retos y misión

- [x] 2.1 Modificar `src/shared/hooks/use-challenge-run.ts` para reproducir `correct` en éxito y `incorrect` en cada error, incluida la revelación final.
- [x] 2.2 Crear pruebas del hook para verificar un sonido por éxito y por error, sin duplicar reproducción al revelar.
- [x] 2.3 Modificar `src/features/mission/components/mission-complete.tsx` para reproducir `mission-complete` una sola vez al montar la pantalla.
- [x] 2.4 Crear o ampliar `mission-complete.test.tsx` para verificar reproducción única y conservar navegación y recompensas actuales.

### Grupo 3 — Mute global y voz existente

- [x] 3.1 Modificar `src/shared/lib/speech.ts` para no iniciar voz cuando `muted` está activo y mantener `stopSpeaking` disponible para detener voz actual.
- [x] 3.2 Modificar `src/features/shell/components/app-shell.tsx` para mostrar botón de mute en el header, con estado accesible, activado por defecto y sin persistencia.
- [x] 3.3 Al activar mute, detener efecto activo y `SpeechSynthesis`; al desactivar mute, no reproducir audio automáticamente.
- [x] 3.4 Ampliar `app-shell.test.tsx` y agregar pruebas de voz para estados, etiquetas accesibles, toggle y bloqueo de reproducción.

## Criterios de aceptación

- [x] Existen `public/audio/correct.mp3`, `public/audio/incorrect.mp3` y `public/audio/mission-complete.mp3`.
- [x] Los assets provienen de Kenney UI Audio con licencia CC0 o son generados originalmente; `public/audio/README.md` registra su procedencia y no dependen de archivos aportados por el usuario.
- [x] `audio.ts` inicia con `muted: false`.
- [x] `toggleMuted` cambia el estado en memoria y recargar la página vuelve a audio activado.
- [x] Un acierto reproduce exactamente `correct.mp3` una vez.
- [x] Cada respuesta incorrecta reproduce exactamente `incorrect.mp3` una vez.
- [x] El error que causa revelación reproduce `incorrect.mp3` una sola vez y no duplica sonido.
- [x] `mission-complete.mp3` se reproduce una sola vez al montar `MissionComplete`.
- [x] Misiones, repaso, tienda y práctica del cuaderno reciben feedback sonoro mediante `useChallengeRun`.
- [x] Header de `AppShell` muestra un control accesible para silenciar y activar audio.
- [x] El control indica estado mediante nombre accesible y no cambia de posición entre rutas.
- [x] Activar mute detiene efectos y `SpeechSynthesis` activos.
- [x] Con mute activo, efectos y voz nuevos no se reproducen.
- [x] Desactivar mute no reproduce audio automáticamente.
- [x] Un archivo ausente, una reproducción rechazada o un navegador sin audio no lanza error visible ni bloquea el reto.
- [x] No se modifica `Progress`, Supabase, tablas, migraciones ni persistencia.
- [x] No hay reproducción automática al cargar rutas o componentes sin una acción previa; el montaje de `MissionComplete` después de resolver el último reto es resultado de esa acción.
- [x] `rtk pnpm lint`, `rtk tsc --noEmit`, `rtk pnpm test` y `rtk pnpm build` pasan.

## Decisiones

- **Sí:** tres efectos locales: `correct`, `incorrect` y `mission-complete`. Cubren feedback principal con alcance pequeño.
- **Sí:** el agente gestiona selección o generación de assets y registra su procedencia en `public/audio/README.md`. Evita bloquear implementación por falta de archivos del usuario.
- **No:** descargar assets con licencia incierta. Solo se usa fuente CC0 verificada o audio generado originalmente.
- **No:** música ambiente, sonidos de navegación y sonidos para compras. Agregan ruido y estados fuera del objetivo.
- **No:** nuevas voces grabadas o reemplazo de `SpeechSynthesis`. La pronunciación existente ya cubre esa necesidad.
- **Sí:** MP3 en `public/audio/`. Mantiene compatibilidad amplia y elimina dependencias externas.
- **No:** Web Audio API, CDN y Supabase Storage. No hacen falta para tres efectos cortos.
- **Sí:** `src/shared/lib/audio.ts` como capa compartida. Evita duplicar reproducción y mute en cada feature.
- **No:** lógica de sonido dentro de cada reto. `useChallengeRun` ya concentra éxito y error para misiones, repaso, tienda y cuaderno.
- **Sí:** `MissionComplete` reproduce sonido una vez al montar. Ese montaje ocurre después de resolver el último reto y pertenece a pantalla de resultado; no es autoplay al cargar una ruta.
- **Sí:** mute global en header de `AppShell`. Es visible en todas las rutas y requiere un solo control.
- **Sí:** mute silencia efectos y `SpeechSynthesis`. Un control representa todo audio.
- **No:** dos controles separados. Duplica UI y puede dejar audio parcialmente activo.
- **Sí:** audio activado por defecto y mute solo en memoria. Evita modificar `Progress` o Supabase.
- **No:** persistir preferencia de audio. No existe necesidad de sincronizarla entre dispositivos en esta spec.
- **Sí:** activar mute detiene audio actual y bloquea audio nuevo. El silencio debe ser inmediato.
- **Sí:** sin autoplay al cargar rutas o componentes. El sonido de resultado solo sigue a una interacción que completa el último reto y respeta política actual de reproducción iniciada por interacción.
- **Sí:** fallar silenciosamente si audio no está disponible. El aprendizaje y el progreso no dependen del sonido.

## Riesgos

| Riesgo                                                                | Mitigación                                                                                                       |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| El navegador bloquea `HTMLAudioElement.play()`                        | Capturar el rechazo y continuar sin sonido; no bloquear retos ni progreso.                                       |
| MP3 ausente, corrupto o con nombre incorrecto                         | Verificar los tres archivos antes de cerrar Grupo 1 y probar sus rutas públicas.                                 |
| Audio accede a `window` durante renderizado servidor                  | Crear elementos de audio solo en cliente y entregar snapshot servidor estable con `useSyncExternalStore`.        |
| `MissionComplete` reproduce varias veces por re-render                | Ejecutar reproducción una sola vez por montaje y cubrirlo con prueba de componente.                              |
| Header queda saturado en móvil                                        | Usar botón compacto, área táctil mínima de 44 px, etiqueta accesible y prueba responsive manual.                 |
| Voz y efecto se superponen                                            | Mantener efectos cortos; activar mute detiene ambos tipos de audio inmediatamente.                               |
| Preferencia mute se pierde al recargar                                | Es comportamiento elegido: mute es temporal y audio inicia activado en cada sesión.                              |
| Assets seleccionados o generados tienen licencia o formato no válidos | Usar Kenney UI Audio con licencia CC0 o audio original; registrar procedencia en `public/audio/README.md` y verificar formato MP3 y nombres antes de cerrar Grupo 1. |

## Lo que **no** entra en esta spec

- Música ambiente o pistas en bucle.
- Nuevas voces grabadas o reemplazo de `SpeechSynthesis`.
- Sonidos para navegación, botones del shell o compras de looks.
- Control de volumen, mezclador o ajustes avanzados.
- Preferencia de audio persistida en Supabase.
- Audio servido desde CDN, Supabase Storage o proveedor externo.
- Generación de tonos con Web Audio API.
- Autoplay de efectos o música sin una acción previa del usuario.

Cada elemento, si entra, va en su propia spec.
