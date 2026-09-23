# SPEC 11 — Rutas de aprendizaje por nivel CEFR

> **Estado:** Implementado
> **Depende de:** SPEC 01 — Repetición espaciada; SPEC 02 — Racha diaria; SPEC 07 — Sonidos de juego; SPEC 10 — Personajes y narrativa de misiones
> **Objetivo:** Organizar la experiencia existente y el nuevo contenido por niveles Básico, Intermedio y Avanzado, con elección manual o diagnóstico opcional.

## Decisiones

- **Básico:** A1–A2, misiones 1–8. **Intermedio:** B1–B2, misión 9 «La entrevista». **Avanzado:** C1, misión 10 «El primer día». Las misiones 11–12 siguen planificadas.
- Las bandas CEFR se guardan en `MissionPlanEntry.band` y `cefrLevel`, independientes de `level` (perfiles de dificultad de retos, del 1 al 5).
- Cada ruta permite empezar de forma independiente; las misiones posteriores se desbloquean al completar la anterior de esa misma banda. Se puede cambiar de banda sin borrar progreso.
- El diagnóstico contiene nueve preguntas estáticas (tres por banda, con audio del navegador opcional). Se recomiendan niveles secuencialmente al acertar al menos 2/3 en cada banda anterior. El resultado es orientativo y no se persiste.
- El primer acceso autenticado sin `courseBand` entra en `/onboarding`, fuera de `AppShell`, con diagnóstico como flujo principal y selección manual como alternativa. Las rutas de juego redirigen allí hasta guardar una banda.
- `/settings` muestra la banda actual, permite cambiarla o repetir el diagnóstico y se accede desde el menú de usuario. Cambiar de banda no borra progreso.
- Conversaciones y práctica oral son guiadas; no se usa IA ni se exige micrófono.
- `progress_core.course_band` es nullable para cuentas anteriores. `resetProgress` borra los datos del juego, pero conserva banda elegida y actualiza la fila raíz con monedas en cero.

## Persistencia

`Progress` avanza a versión 7 y agrega `courseBand: CourseBand | null`. La migración aditiva agrega `progress_core.course_band` con restricción para `basic`, `intermediate` y `advanced`. El mapeador tolera filas antiguas sin la columna; no se aplica ninguna migración remota como parte de esta implementación.

## Verificación

- [x] El onboarding ofrece diagnóstico, elección manual y guardado de banda antes de entrar al mapa.
- [x] Configuración permite cambiar de banda o repetir diagnóstico sin borrar progreso.
- [x] El progreso desbloquea rutas de forma independiente y conserva la selección tras reiniciar.
- [x] Hay contenido jugable y validado en cada banda; solo las misiones 11–12 quedan planificadas.
- [x] Tests cubren diagnóstico, contenido, persistencia, reset y cambio de ruta.
- [x] Validación local con `rtk pnpm test`, `rtk pnpm lint`, `rtk tsc --noEmit` y `rtk pnpm exec next build --webpack`. Turbopack no pudo abrir su puerto de proceso en este entorno.

## Relación con SPEC 10

Esta spec amplía el currículo después de SPEC 10: misiones 9 y 10 se escriben aquí y pasan a `written: true`. La restricción original de mantener 9–12 sin escribir pertenecía al alcance de SPEC 10 y queda reemplazada para esta nueva funcionalidad; no se modificó el sistema de personajes ni la progresión de los retos.
