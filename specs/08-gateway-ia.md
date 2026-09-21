# SPEC 08 — Gateway de IA configurable

> **Estado:** Implementado
> **Depende de:** Ninguna spec funcional; usa Next.js 16 App Router
> **Fecha:** 2026-09-21
> **Objetivo:** Crear un gateway server-only para OpenRouter que permita cambiar el modelo mediante configuración, valide respuestas estructuradas y desactive IA sin romper la app cuando no esté disponible.

## Alcance

**Dentro:**

- Crear servicio `server-only` para llamadas de texto a OpenRouter mediante `fetch` nativo.
- Configurar proveedor, API key y modelo desde variables de entorno.
- Usar `qwen/qwen3.8-27b:free` como modelo inicial configurable.
- Definir contrato de entrada para solicitudes estructuradas.
- Enviar `response_format` con JSON Schema cuando modelo lo soporte.
- Validar respuesta recibida antes de entregarla a futuras features.
- Devolver errores controlados para clave ausente, proveedor no disponible, límite externo y respuesta inválida.
- Mantener IA desactivada sin bloquear aplicación cuando configuración no exista.
- Agregar pruebas con `fetch` simulado, sin llamadas reales ni secretos.
- Mantener gateway reutilizable para ayuda contextual, autoría y futuras funciones.

**Fuera de alcance:**

- Route Handler público para estudiantes; queda para spec de cuota y acceso.
- Cuota diaria y tabla `ai_usage`; quedan para spec separada.
- UI de ayuda contextual y cambios en `StoryBeat`.
- Historial de prompts, respuestas o palabras consultadas.
- Chat libre, tutor conversacional y calificación por IA.
- Generación o modificación automática del currículo JSON.
- Envío de progreso, correo, historial o datos personales a OpenRouter.
- SDK nuevo de IA, almacenamiento de API keys en cliente y claves `NEXT_PUBLIC_*`.
- Fallback automático entre modelos en esta spec; si gateway falla, futura feature continúa sin IA.

## Modelo de datos

Esta spec no agrega tablas ni persistencia. Agrega configuración de servidor y tipos runtime en `src/shared/lib/ai/`.

```env
# .env.local y .env.example
AI_BASE_URL=https://openrouter.ai/api/v1/chat/completions
AI_API_KEY=
AI_MODEL=qwen/qwen3.8-27b:free
```

`AI_API_KEY` nunca usa prefijo `NEXT_PUBLIC_`.

```ts
// src/shared/lib/ai/types.ts
export type AiMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type AiJsonSchema = {
  name: string;
  strict?: boolean;
  schema: Record<string, unknown>;
};

export type GenerateStructuredInput<T> = {
  messages: AiMessage[];
  schema: AiJsonSchema;
  parse: (value: unknown) => T | null;
  model?: string;
};

export type AiUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type AiErrorCode = 'disabled' | 'invalid-config' | 'provider-error' | 'rate-limited' | 'invalid-response';

export type AiResult<T> =
  | {
      ok: true;
      value: T;
      model: string;
      usage?: AiUsage;
    }
  | {
      ok: false;
      code: AiErrorCode;
      retryable: boolean;
    };
```

Convenciones:

- `AI_BASE_URL` permite cambiar proveedor compatible sin tocar features.
- `AI_MODEL` permite cambiar modelo sin cambiar código.
- `parse` valida respuesta después de `JSON.parse`.
- El gateway no recibe prompts libres desde navegador.
- El gateway no guarda mensajes, respuestas, correo ni progreso.
- El gateway no devuelve API key ni contenido de error del proveedor al cliente.
- `usage` vive solo en memoria durante solicitud y queda disponible para futuras métricas.
- Modelo inicial debe soportar `response_format` o `structured_outputs`; si no, gateway devuelve `invalid-config` o `provider-error`.

## Plan de implementación

### Grupo 1 — Configuración server-only

- [x] 1.1 Crear `src/shared/lib/ai/types.ts` con mensajes, JSON Schema, resultado, errores y uso.
- [x] 1.2 Crear `src/shared/lib/ai/config.server.ts` para leer `AI_BASE_URL`, `AI_API_KEY` y `AI_MODEL` sin exponer secretos.
- [x] 1.3 Hacer que configuración ausente devuelva estado `disabled` en vez de lanzar error global.
- [x] 1.4 Actualizar `.env.example` con URL, clave y modelo inicial.
- [x] 1.5 Crear `src/shared/lib/ai/config.server.test.ts` para valores configurados, modelo predeterminado y clave ausente.

### Grupo 2 — Gateway estructurado

- [x] 2.1 Crear `src/shared/lib/ai/gateway.server.ts` como módulo `server-only` y enviar solicitudes mediante `fetch`.
- [x] 2.2 Construir payload OpenRouter con mensajes, modelo y `response_format` JSON Schema.
- [x] 2.3 Parsear respuesta, extraer uso y ejecutar `parse` antes de devolver datos.
- [x] 2.4 Mapear respuestas no exitosas, JSON inválido, respuesta vacía y errores de red a `AiErrorCode` sin filtrar detalles del proveedor.
- [x] 2.5 Crear `src/shared/lib/ai/gateway.server.test.ts` con `fetch` simulado para éxito, modelo configurable, IA desactivada, error `429`, error `5xx`, JSON inválido y respuesta incompatible.

### Grupo 3 — Documentación de frontera

- [x] 3.1 Documentar en `AGENTS.md` módulo server-only, variables `AI_*`, modelo gratuito inicial y regla de no enviar secretos al cliente.
- [x] 3.2 Verificar que ningún módulo cliente importe gateway o configuración server-only.

## Criterios de aceptación

- [x] `.env.example` documenta `AI_BASE_URL`, `AI_API_KEY` y `AI_MODEL`.
- [x] Ninguna variable IA usa prefijo `NEXT_PUBLIC_`.
- [x] `AI_MODEL` usa `qwen/qwen3.8-27b:free` como valor inicial.
- [x] Cambiar `AI_BASE_URL` o `AI_MODEL` modifica destino o modelo sin cambiar código del gateway.
- [x] Gateway importa `server-only` y ningún componente cliente lo importa.
- [x] Sin `AI_API_KEY`, gateway devuelve `code: "disabled"` sin llamar a `fetch`.
- [x] Gateway envía `Authorization`, modelo, mensajes y `response_format` JSON Schema al endpoint configurado.
- [x] Respuesta válida se convierte en `ok: true` después de `JSON.parse` y `parse`.
- [x] Uso de tokens se mapea a `promptTokens`, `completionTokens` y `totalTokens` cuando proveedor lo devuelve.
- [x] Respuesta vacía, JSON inválido o resultado rechazado por `parse` devuelve `code: "invalid-response"`.
- [x] Estado HTTP `429` devuelve `code: "rate-limited"`.
- [x] Estados HTTP `4xx`, `5xx` y errores de red devuelven error controlado sin lanzar detalle del proveedor.
- [x] Ningún resultado o error devuelve API key, encabezado `Authorization` ni prompt completo.
- [x] Gateway no escribe en Supabase ni guarda mensajes, respuestas o historial.
- [x] No existe Route Handler público ni UI de IA al cerrar esta spec.
- [x] Tests cubren configuración, éxito, modelo configurable, IA desactivada, errores HTTP, red, JSON inválido y respuesta incompatible usando `fetch` simulado.
- [x] `rtk pnpm lint`, `rtk tsc --noEmit`, `rtk pnpm test` y `rtk pnpm build` pasan.

## Decisiones

- **Sí:** OpenRouter como proveedor inicial. Ofrece modelos gratuitos y API unificada para cambiar modelo después.
- **No:** Groq directo como integración inicial. Ata gateway a un solo proveedor.
- **Sí:** `fetch` nativo. Evita SDK y dependencia nueva.
- **Sí:** `AI_BASE_URL`, `AI_API_KEY` y `AI_MODEL` configurables. Permiten cambiar proveedor compatible, clave y modelo sin modificar features.
- **Sí:** `qwen/qwen3.8-27b:free` como modelo inicial. La ficha investigada indica soporte para `structured_outputs`.
- **No:** `openrouter/free` como modelo inicial. Puede cambiar modelo entre solicitudes y variar calidad.
- **Sí:** gateway `server-only`. Protege API key y evita llamadas desde navegador.
- **Sí:** transporte estructurado genérico. Permite reutilizar gateway para ayuda, autoría y tutoría futura.
- **No:** endpoint de prompt libre. Aumentaría abuso, costo y respuestas sin contrato.
- **Sí:** JSON Schema más `parse` runtime. Reduce respuestas inválidas antes de entregarlas a una feature.
- **Sí:** IA desactivada cuando falta clave. La app debe funcionar sin configuración de IA.
- **No:** fallo global al iniciar servidor. Bloquearía desarrollo y despliegues sin IA.
- **Sí:** sin persistencia. Esta spec no guarda prompts, respuestas, historial ni progreso.
- **No:** cambios en Supabase. Cuota diaria queda en spec separada.
- **No:** Route Handler público en esta spec. Se agregará junto con autenticación y cuota.
- **No:** fallback automático entre modelos. Se prioriza comportamiento reproducible; queda para una necesidad futura.
- **Sí:** dividir iniciativa en tres specs: gateway, cuota y ayuda contextual. Reduce alcance por frontera técnica.

## Riesgos

| Riesgo                                                                | Mitigación                                                                                                  |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Modelo gratuito desaparece, cambia límites o deja de estar disponible | Mantener `AI_MODEL` configurable y continuar sin IA cuando proveedor falle.                                 |
| Modelo configurado no soporta `structured_outputs`                    | Validar respuesta en gateway y devolver error controlado; verificar compatibilidad antes de cambiar modelo. |
| Proveedor cambia formato o códigos de error                           | Encapsular transporte en gateway y cubrir respuestas HTTP, JSON inválido y errores de red.                  |
| API key llega al navegador o aparece en logs                          | Usar módulos `server-only`, variables sin `NEXT_PUBLIC_` y no devolver detalles del proveedor.              |
| Solicitud tarda demasiado o queda pendiente                           | Abortar solicitud con timeout y devolver error controlado sin bloquear futuras features.                    |
| Feature futura envía datos personales o demasiado contexto            | Mantener gateway sin historial ni logs; cada feature debe enviar solo contexto educativo mínimo.            |
| Cambiar a otro proveedor rompe contrato                               | Limitar configuración a endpoints compatibles y verificar `response_format` antes de activar modelo nuevo.  |
| Falta de clave oculta error de configuración                          | Estado `disabled` explícito y prueba manual con clave presente antes de habilitar una feature.              |

## Lo que **no** entra en esta spec

- Route Handler público para estudiantes.
- Cuota diaria y tabla `ai_usage`.
- UI de ayuda contextual y cambios en `StoryBeat`.
- Historial de prompts, respuestas o palabras consultadas.
- Chat libre, tutor conversacional y calificación por IA.
- Generación o modificación automática del currículo JSON.
- Envío de progreso, correo, historial o datos personales a OpenRouter.
- SDK nuevo de IA.
- Almacenamiento de API keys en cliente o variables `NEXT_PUBLIC_*`.
- Fallback automático entre modelos.

Cada elemento, si entra, va en su propia spec.
