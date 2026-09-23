# SPEC 12 — Tutor de inglés con IA

> **Estado:** Implementado
> **Depende de:** SPEC 08 — Gateway de IA configurable; SPEC 10 — Personajes y narrativa de misiones; SPEC 11 — Rutas de aprendizaje por nivel CEFR
> **Fecha:** 2026-09-23
> **Objetivo:** Integrar a Coco como tutor de inglés con IA en las misiones para resolver dudas y corregir frases con ejemplos, sin alterar resultados del juego.

## Alcance

**Dentro:**

- Agregar un panel de Coco, abierto a demanda desde una misión, para preguntar sobre inglés fuera de su contenido.
- Corregir frases que el estudiante envíe, con explicación breve en español neutro, un ejemplo en inglés y una curiosidad relacionada cuando aporte valor.
- Adaptar respuestas al nivel CEFR y al contexto de la misión actual.
- Mantener la conversación mientras el panel esté abierto; al cerrarlo, descartar los mensajes.
- Limitar el uso a 50 consultas diarias por cuenta mediante un contador en Supabase; mostrar error y reintento si IA falla, sin bloquear la misión.

**Fuera de alcance:**

- Corregir automáticamente cada respuesta escrita de los retos.
- Cambiar aciertos, puntuación, recompensas, progreso o avance mediante IA.
- Responder consultas ajenas al aprendizaje del inglés.
- Guardar conversaciones para retomarlas en otra sesión.
- Tutoría por voz o uso del micrófono.

## Modelo de datos

La conversación vive solo en memoria del panel. Al cerrarlo, se descarta; no se guarda historial en Supabase.

```ts
type TutorMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type TutorRequest = {
  message: string; // 1–1,000 caracteres
  history: TutorMessage[]; // hasta 10 intercambios recientes
  missionSlug: string;
};

type TutorReply = {
  explanation: string; // español neutro
  correction: {
    original: string;
    corrected: string;
    reason: string;
  } | null;
  example: {
    english: string;
    spanish: string;
  };
  curiosity: string | null;
};
```

El servidor obtiene el nivel CEFR con `readProgress(user.id)` y resuelve la misión con `findMission(missionSlug)`. No acepta esos datos como autoridad desde el navegador.

La migración agrega `public.ai_usage` con una fila por cuenta:

```sql
create table public.ai_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  usage_day date not null,
  successful_responses smallint not null default 0
    check (successful_responses between 0 and 50)
);
```

`usage_day` usa fecha UTC. Solo las respuestas entregadas consumen cuota. El registro de respuestas exitosas es atómico y no guarda texto de preguntas ni respuestas.

## Plan de implementación

### Grupo 1 — Cuota diaria

- [x] 1.1 Crear `supabase/migrations/<timestamp>_create_ai_usage.sql` con contador por cuenta, día UTC, acceso restringido y función transaccional para registrar respuestas exitosas sin superar 50.
- [x] 1.2 Crear `src/features/tutor/server/tutor-usage.server.ts` para consultar y actualizar la cuota de forma segura.
- [x] 1.3 Probar límite diario, cambio de día UTC y que los fallos de IA no consuman cuota.

### Grupo 2 — Endpoint autenticado

- [x] 2.1 Crear `src/features/tutor/server/tutor-service.server.ts` para validar la entrada, resolver nivel con `readProgress`, resolver misión con `findMission` y generar una respuesta estructurada mediante el gateway existente.
- [x] 2.2 Crear `src/app/api/tutor/route.ts` con autenticación, límite de 1,000 caracteres, cuota y errores controlados.
- [x] 2.3 Agregar pruebas de autenticación, entrada inválida, cuota, respuesta válida y fallos del proveedor.

### Grupo 3 — Panel de Coco

- [x] 3.1 Crear `src/features/mission/components/tutor-panel.tsx` con preguntas, historial temporal, carga, error, reintento y estado de cuota agotada.
- [x] 3.2 Integrar apertura y cierre del panel en `src/features/mission/components/mission-player.tsx`; al cerrarlo, descartar historial y no modificar retos.
- [x] 3.3 Probar consultas, correcciones, error y reintento, cierre del panel y que los resultados de misión sigan iguales.

## Criterios de aceptación

- [x] Desde una misión, el estudiante puede abrir Coco a demanda y preguntar sobre inglés fuera de la lección actual; preguntas sobre otros temas se redirigen al aprendizaje del inglés.
- [x] Cada respuesta válida incluye explicación en español neutro y un ejemplo en inglés con traducción; si el estudiante pide corrección, Coco muestra frase original, corrección y motivo.
- [x] El endpoint rechaza usuarios no autenticados y mensajes vacíos o mayores de 1,000 caracteres; obtiene nivel CEFR y misión desde fuentes del servidor.
- [x] La cuenta recibe como máximo 50 respuestas exitosas por día UTC; los fallos no consumen cuota y la cuota se reinicia al cambiar el día UTC.
- [x] Los errores de IA permiten reintentar sin bloquear la misión; cerrar el panel descarta la conversación y el tutor nunca cambia retos, resultados ni progreso. Lint, typecheck, tests y build pasan.

## Decisiones

- **Sí:** reutilizar el gateway server-only de SPEC 08. **No:** llamar al proveedor desde el navegador; protege la clave y conserva la arquitectura existente.
- **Sí:** abrir el tutor a demanda desde una misión y corregir frases solo cuando el estudiante lo pide. **No:** crear una página independiente ni revisar automáticamente respuestas de retos; mantiene la tutoría fuera del flujo obligatorio.
- **Sí:** responder dudas de inglés fuera de la misión actual con explicación en español neutro, ejemplo y curiosidad cuando aporte. **No:** chat general; mantiene el objetivo educativo.
- **Sí:** dejar la calificación y el progreso bajo la lógica actual del juego. **No:** permitir que la IA decida aciertos, puntuación o avance.
- **Sí:** mantener el historial solo mientras el panel está abierto y guardar únicamente el contador diario de 50 respuestas exitosas por cuenta, con reinicio UTC. **No:** guardar transcripciones; limita los datos persistentes.

## Riesgos

| Riesgo                                                                                 | Mitigación                                                                                                                                                                   |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El gateway está desactivado o el proveedor devuelve un error o una respuesta inválida. | Mostrar error y reintento; no bloquear la misión; validar la respuesta estructurada antes de mostrarla.                                                                      |
| Coco entrega una explicación incorrecta o se desvía del inglés.                        | Limitar instrucciones y contexto al aprendizaje del inglés; no permitir que la IA califique retos; revisar respuestas con casos representativos.                             |
| Las preguntas y el contexto de sesión se envían al proveedor configurado.              | Enviar solo mensaje, conversación temporal, nivel CEFR y misión; no incluir correo ni progreso; no guardar transcripciones.                                                  |
| Solicitudes simultáneas llegan cerca del límite diario.                                | Registrar respuestas entregadas de forma atómica; no entregar una respuesta si la cuota ya llegó a 50. Una llamada concurrente aún podría generar costo antes de bloquearse. |

## Lo que **no** entra en esta spec

- Corregir automáticamente respuestas escritas de retos o permitir que IA cambie aciertos, puntuación, recompensas, progreso o avance.
- Responder consultas generales ajenas al aprendizaje del inglés.
- Crear una página independiente para el tutor.
- Guardar o recuperar transcripciones entre sesiones.
- Agregar tutoría por voz o uso del micrófono.

Cada elemento, si se implementa, debe entrar en una spec posterior.
