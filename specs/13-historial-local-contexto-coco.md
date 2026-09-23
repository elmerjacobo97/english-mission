# SPEC 13 — Historial local y contexto de paso para Coco

> **Estado:** Implementado
> **Depende de:** SPEC 12 — Tutor de inglés con IA
> **Fecha:** 2026-09-23
> **Objetivo:** Conservar conversaciones de Coco localmente por cuenta y misión, y darle contexto del paso activo para responder dudas concretas.

## Alcance

**Dentro:**

- Guardar en `localStorage` mensajes y respuestas de Coco, separados por cuenta y misión.
- Restaurar conversación al reabrir Coco o regresar a la misión, incluso después de recargar la página.
- Agregar el botón **Limpiar historial** para borrar todas las conversaciones locales de Coco de la cuenta actual.
- Enviar el índice del paso visible al endpoint. El servidor resuelve el beat desde la misión del catálogo y entrega ese contexto a Coco.
- Mantener cuota diaria, reintentos y comportamiento de la misión sin cambios.

**Fuera de alcance:**

- Guardar conversaciones en Supabase o sincronizarlas entre dispositivos.
- Compartir historial entre misiones o cuentas.
- Guardar borradores, estados de carga o errores de solicitudes.
- Agregar exportación, descarga o botón para copiar respuestas.

## Modelo de datos

La conversación guardada incluye preguntas y respuestas completas para volver a renderizar correcciones y ejemplos.

```ts
export type TutorConversationMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; reply: TutorReply };

export type TutorRequest = {
  message: string;
  history: TutorMessage[];
  missionSlug: string;
  beatIndex: number; // Índice base cero; el servidor valida y resuelve el beat.
};
```

La clave de `localStorage` usa este formato:

```text
english-mission:coco-tutor:v1:${userId}:${missionSlug}
```

El valor es JSON con `{ messages: TutorConversationMessage[] }`. El identificador de cuenta y el slug de misión aíslan cada conversación. El endpoint recibe `missionSlug` y `beatIndex`, y obtiene el beat canónico desde el catálogo; no recibe texto de beat como autoridad desde el navegador.

## Plan de implementación

### Grupo 1 — Historial local

- [x] 1.1 Pasar `userId` desde `requireCourseBand()` en `src/app/(app)/mission/[slug]/page.tsx` hasta `TutorPanel`, y usarlo junto con `missionSlug` para seleccionar el historial.
- [x] 1.2 Persistir y restaurar `TutorConversationMessage[]` en `src/features/mission/components/tutor-panel.tsx`; capturar errores de almacenamiento y conservar funcionamiento en memoria.
- [x] 1.3 Agregar **Limpiar historial** para borrar todas las claves de la cuenta actual y limpiar los mensajes visibles.
- [x] 1.4 Probar restauración al cerrar/reabrir y recargar, aislamiento por cuenta y misión, borrado total y ausencia de cambios al progreso de misión.

### Grupo 2 — Contexto del paso activo

- [x] 2.1 Agregar `beatIndex` a `TutorRequest` y enviarlo desde `MissionPlayer`; validar que sea entero y esté dentro del rango de beats de la misión.
- [x] 2.2 Resolver `mission.beats[beatIndex]` en servidor y agregar número y contenido del paso activo a las instrucciones de Coco.
- [x] 2.3 Probar el prompt con paso 3 de “El bus” y verificar que incluya “Is this the right bus stop?”; probar también índices inválidos.

## Criterios de aceptación

- [x] Al cerrar y reabrir Coco, se restaura conversación de misión.
- [x] Al salir de misión y volver, conversación sigue disponible después de recargar la página.
- [x] El historial queda separado por cuenta y misión.
- [x] **Limpiar historial** borra todos los historiales locales de la cuenta actual y limpia el panel abierto.
- [x] Si `localStorage` falla, Coco sigue funcionando en memoria sin bloquear la misión.
- [x] Cada solicitud incluye el índice del paso visible; servidor resuelve el beat canónico y agrega su contenido al prompt de IA.
- [x] Para `missionSlug: "bus"` y `beatIndex: 2`, el prompt contiene “Is this the right bus stop?” y no confunde ese beat con el contenido del paso 5.
- [x] Índices negativos o fuera de rango se rechazan.
- [x] El historial no se guarda en Supabase; la función no cambia progreso, retos ni cuota diaria.
- [x] Lint, typecheck, tests y build pasan.

## Decisiones

- **Sí:** `localStorage` por cuenta y misión, con clave versionada. No requiere base de datos ni sincronización.
- **Sí:** una conversación independiente por misión. **No:** conversación global compartida entre misiones.
- **Sí:** un botón borra todo historial local de la cuenta actual. No borra historial de otras cuentas del navegador.
- **Sí:** el navegador envía el índice del paso. Servidor resuelve beat canónico. **No:** confiar en texto de beat enviado por cliente.
- **Sí:** crear SPEC 13 y dejar SPEC 12 intacta, porque define explícitamente que el historial se descarta al cerrar.

## Riesgos

| Riesgo                                                      | Mitigación                                                                                                        |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `localStorage` está deshabilitado o lleno.                  | Capturar errores y mantener tutor operativo en memoria.                                                           |
| Datos guardados están corruptos o pertenecen a otra cuenta. | Validar JSON y usar clave por cuenta y misión; ignorar registro inválido.                                         |
| Coco aún responde mal aunque reciba el paso correcto.       | Verificar que el prompt recibe beat canónico; las pruebas no pueden garantizar la respuesta semántica del modelo. |
| Cliente manipula `beatIndex`.                               | Validar rango en servidor y resolver beat desde `mission.beats`.                                                  |

## Lo que **no** entra en esta spec

- Guardar conversaciones en Supabase o sincronizarlas entre dispositivos.
- Compartir conversación entre misiones o cuentas.
- Persistir borradores, errores o estados de carga.
- Exportar, descargar o agregar botón para copiar respuestas.
- Cambiar cuota de IA, progreso, retos o resultados de misión.

Cada elemento, si se implementa, debe entrar en una spec posterior.
