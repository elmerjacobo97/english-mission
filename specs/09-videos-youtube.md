# SPEC 09 — Transcript sincronizado de YouTube

> **Estado:** Implementado
> **Depende de:** SPEC 06 — Progreso Supabase
> **Fecha:** 2026-09-21
> **Objetivo:** Permitir que un usuario pegue una URL de YouTube, obtenga un transcript en inglés con timestamps mediante Supadata, lo lea sincronizado línea por línea y lo reanude desde una biblioteca persistida.

## Alcance

**Dentro:**

- Crear ruta autenticada `/videos` y acceso desde navegación principal.
- Aceptar URLs `youtube.com/watch`, `youtu.be` y `youtube.com/shorts`.
- Validar URL y extraer `videoId` sin enviar claves al navegador.
- Obtener transcript en inglés mediante Supadata con `mode: "native"`.
- Normalizar segmentos con texto, inicio y duración en milisegundos.
- Mostrar player oficial de YouTube con reproducción iniciada por el usuario.
- Resaltar transcript línea por línea según posición actual del video.
- Mostrar título y thumbnail del video.
- Guardar automáticamente video procesado y segmentos completos en una fila JSONB de Supabase.
- Mantener biblioteca máxima de 20 videos por usuario.
- Reabrir videos duplicados sin consumir nueva cuota.
- Listar, abrir y eliminar videos guardados.
- Guardar posición al pausar o salir y reanudar desde esa posición.
- Limitar procesamiento a 10 videos nuevos por usuario y día.
- Mostrar estados claros para URL inválida, transcript no disponible, idioma no inglés, video no reproducible, límite alcanzado y proveedor no disponible.
- Mantener API key de Supadata exclusivamente en servidor.
- Agregar pruebas para validación, proveedor, persistencia, sincronización, cuota y estados de error.
- Mantener `Progress` versión 6 sin mezclar biblioteca de videos con monedas, misiones, racha o repaso.

**Fuera de alcance (para specs futuras):**

- Integración con gateway de IA.
- Traducciones, ejemplos, explicaciones gramaticales y ejercicios.
- Sincronización palabra por palabra.
- Descargar, importar o almacenar audio/video de YouTube.
- Scraping o APIs no documentadas de YouTube.
- Fallback mediante transcripción propia del audio.
- Pegar transcript manualmente como alternativa.
- Playlists, búsqueda, recomendaciones o descubrimiento de videos.
- Modo offline.
- Monedas, estrellas, racha, flashcards o repaso espaciado derivados de videos.
- Más de un proveedor de transcript en esta spec.
- Cambio de proveedor desde la interfaz.

## Modelo de datos

La biblioteca no modifica `Progress` ni sube su versión. Agrega tablas propias en Supabase.

```ts
export type TranscriptSegment = {
  text: string;
  startMs: number;
  durationMs: number;
};

export type VideoLibraryItem = {
  videoId: string;
  url: string;
  title: string;
  thumbnailUrl: string | null;
  language: 'en';
  segments: TranscriptSegment[];
  positionMs: number;
  createdAt: string;
  updatedAt: string;
};
```

Tabla `public.video_library`:

```sql
user_id uuid
video_id text
url text
title text
thumbnail_url text
language text
segments jsonb
position_ms integer
created_at timestamptz
updated_at timestamptz
primary key (user_id, video_id)
```

Tabla `public.video_processing_usage`:

```sql
user_id uuid
day date
count smallint
primary key (user_id, day)
```

Convenciones:

- `video_id` es identidad canónica. URL duplicada reabre registro existente.
- `segments` guarda segmentos completos con tiempos en milisegundos.
- `position_ms` guarda última posición válida del video.
- Biblioteca aplica RLS con `auth.uid() = user_id`.
- Cuota se incrementa mediante operación atómica en DB.
- Cada solicitud nueva enviada a Supadata consume una unidad.
- Video ya guardado no consume cuota.
- Cuota usa día UTC y máximo 10 solicitudes.
- Segmentos solo se guardan después de respuesta válida de Supadata.
- Transcript solo acepta idioma `en`.
- Respuesta cruda del proveedor no se persiste.
- Configuración server-only:

```env
TRANSCRIPT_BASE_URL=https://api.supadata.ai/v1/transcript
TRANSCRIPT_API_KEY=
TRANSCRIPT_MODE=native
```

- El modo `native` evita fallback generativo del proveedor.
- API key nunca usa prefijo `NEXT_PUBLIC_`.

## Plan de implementación

### Grupo 1 — Contrato, proveedor y esquema

- [x] 1.1 Crear tipos `TranscriptSegment` y `VideoLibraryItem`, parser de URL de YouTube y normalizador de segmentos en `src/features/videos/utils/`; cubrir URLs válidas, URLs rechazadas, idioma `en`, offsets y duraciones.
- [x] 1.2 Crear cliente server-only de Supadata en `src/features/videos/server/transcript-provider.server.ts`; usar `fetch` nativo, `mode: "native"`, timeout, validación runtime y errores controlados; agregar configuración a `.env.example` y pruebas con `fetch` simulado.
- [x] 1.3 Definir `video_library`, `video_processing_usage`, RLS, grants y operación atómica de cuota; mantener `Progress` versión 6.
- [x] 1.4 Crear migración inicial versionada con las 6 tablas actuales de Progress y tablas de videos; eliminar `schema.sql`; documentar aplicación mediante Supabase CLI.

### Grupo 2 — Persistencia y API autenticada

- [x] 2.1 Crear repositorio server-only de biblioteca para listar, encontrar por `video_id`, guardar, eliminar y actualizar `position_ms`; bloquear nuevos registros cuando existan 20 videos.
- [x] 2.2 Crear `POST /api/videos/process`; validar usuario y URL, reabrir duplicados, verificar cuota y límite de biblioteca, pedir transcript a Supadata, obtener metadata, validar segmentos y guardar resultado.
- [x] 2.3 Crear `GET /api/videos`, `DELETE /api/videos/[videoId]` y `PATCH /api/videos/[videoId]/position`; no devolver claves, errores internos ni respuesta cruda del proveedor.
- [x] 2.4 Agregar pruebas de rutas para autenticación, duplicados, cuota, límite de 20, errores del proveedor, guardado y actualización de posición.

### Grupo 3 — Player y transcript sincronizado

- [x] 3.1 Crear wrapper cliente del YouTube IFrame Player API en `src/features/videos/components/`; cargar API una sola vez, iniciar reproducción solo por acción del usuario y exponer estado, errores y posición.
- [x] 3.2 Crear `TranscriptViewer` para mostrar segmentos en inglés y resaltar la línea cuyo intervalo contiene `currentTime`.
- [x] 3.3 Crear hook de sesión de video para coordinar player, segmento activo, posición inicial guardada y actualización al pausar o salir.
- [x] 3.4 Agregar pruebas de selección de segmento, reanudación, pausa, seek y estados de player no disponible.

### Grupo 4 — Página y biblioteca

- [x] 4.1 Crear ruta `/videos` con `PageHeader`, formulario de URL, estados de carga, error y transcript no disponible.
- [x] 4.2 Crear biblioteca visual con título, thumbnail, duración disponible, posición guardada, acciones Abrir y Eliminar, y bloqueo explicativo al llegar a 20 videos.
- [x] 4.3 Integrar procesamiento, apertura, eliminación y reanudación mediante hooks del feature; videos guardados no vuelven a llamar a Supadata.
- [x] 4.4 Agregar `/videos` a `AppShell` y cubrir responsive, navegación de teclado, etiquetas accesibles y controles táctiles.

## Criterios de aceptación

- [x] Usuario autenticado puede abrir `/videos` desde navegación principal.
- [x] `/videos` acepta URLs `youtube.com/watch`, `youtu.be` y `youtube.com/shorts`.
- [x] URL inválida no llama a Supadata y muestra error comprensible.
- [x] API key de Supadata no aparece en bundle, navegador, respuesta HTTP ni logs.
- [x] Procesamiento solicita transcript en inglés con `mode: "native"`.
- [x] Respuesta válida se normaliza a segmentos con `text`, `startMs` y `durationMs`.
- [x] Transcript sin segmentos válidos no se guarda y muestra estado de indisponibilidad.
- [x] Video procesado muestra player oficial de YouTube y no inicia reproducción automáticamente.
- [x] Transcript resalta exactamente una línea cuando `currentTime` cae dentro de su intervalo.
- [x] Player pausado, terminado, no embebible o bloqueado muestra estado controlado sin romper la página.
- [x] Video válido guarda título, thumbnail, URL, `videoId`, idioma, segmentos y posición inicial.
- [x] Biblioteca persiste después de cerrar sesión y volver a iniciar sesión con la misma cuenta.
- [x] RLS impide que un usuario lea, actualice o elimine videos de otra cuenta.
- [x] Esquema completo de Supabase queda en migraciones versionadas y puede aplicarse a una base nueva con Supabase CLI.
- [x] URL ya guardada reabre el registro sin llamar nuevamente a Supadata ni consumir cuota.
- [x] Usuario puede abrir y eliminar cualquier video propio desde biblioteca.
- [x] Posición se guarda al pausar o salir y el video vuelve cerca de esa posición al abrirse.
- [x] Usuario no puede guardar un video nuevo cuando biblioteca ya contiene 20; se le pide eliminar uno.
- [x] Cada usuario puede procesar como máximo 10 videos nuevos por día UTC.
- [x] Solicitudes duplicadas no consumen cuota.
- [x] Operación de cuota es atómica y no permite superar el límite con solicitudes simultáneas.
- [x] Errores 401, 402, 404, 429, 5xx, timeout y red se convierten en mensajes controlados.
- [x] Supabase no guarda respuesta cruda del proveedor.
- [x] SPEC 09 no llama al gateway IA ni genera traducciones, ejemplos o ejercicios.
- [x] No se descarga, importa ni almacena audio o video de YouTube.
- [x] No se usan APIs no documentadas ni scraping de YouTube.
- [x] Pruebas cubren parser, proveedor, normalización, rutas, RLS representativo, cuota, biblioteca, player y sincronización.
- [x] `rtk pnpm lint`, `rtk tsc --noEmit`, `rtk pnpm test` y `rtk pnpm build` pasan.

## Decisiones

- **Sí:** Supadata como proveedor inicial. Entrega segmentos timestampados mediante API documentada y ofrece free tier.
- **Sí:** `mode: "native"`. Evita fallback generativo de Supadata en esta spec.
- **No:** YouTube Data API para transcripts arbitrarios. Captions API requiere autorización del propietario y `captions.download` exige permiso para editar el video.
- **No:** Paquete npm extractor no oficial. Puede romperse con cambios de YouTube y usa APIs no documentadas.
- **Sí:** `fetch` nativo server-only. Evita agregar `@supadata/js` y sigue patrón de `gateway.server.ts`.
- **Sí:** YouTube IFrame Player API oficial. Mantiene reproducción dentro del player oficial y evita descargar audio/video.
- **No:** Descargar, importar o almacenar audio/video de YouTube.
- **Sí:** Transcript línea por línea. Es suficiente para primera versión y evita alinear cada palabra.
- **No:** Sincronización palabra por palabra. Queda para una spec posterior.
- **Sí:** Ruta independiente `/videos`. La función cubre canciones, entrevistas, vlogs y otros videos.
- **Sí:** Biblioteca persistida en Supabase. El usuario espera volver a sus videos sin reprocesarlos.
- **Sí:** Tabla propia `video_library`. No se mezcla contenido multimedia con `Progress` v6.
- **Sí:** Migraciones versionadas como fuente única del esquema completo. Evita mantener `schema.sql` y SQL Editor como segundo workflow.
- **Sí:** Segmentos en una columna JSONB. Máximo 20 videos hace innecesaria una tabla por segmento.
- **Sí:** Guardado automático tras transcript válido. Evita otro paso después de pegar URL.
- **Sí:** URL duplicada reabre registro existente. Evita llamadas y cobros repetidos.
- **Sí:** Límite de 20 videos. Al alcanzar límite, se bloquea nuevo guardado y se pide eliminar uno.
- **No:** Eliminación automática del video más antiguo o menos usado.
- **Sí:** Límite de 10 procesamientos nuevos por usuario y día UTC. Protege cuota externa.
- **Sí:** Cada solicitud nueva enviada al proveedor consume cuota. Videos duplicados no consumen cuota.
- **Sí:** Inglés como único idioma. Encaja con objetivo actual de English Mission.
- **No:** Traducciones, ejemplos, explicaciones gramaticales y ejercicios. Van en una spec futura.
- **No:** Fallback de transcript pegado manualmente. Mantiene URL automática como valor central.
- **No:** Playlists, búsqueda, recomendaciones u offline. Amplían alcance sin mejorar primera validación.

## Riesgos

| Riesgo                                                                 | Mitigación                                                                                                              |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Supadata cambia API, precios o disponibilidad                          | Encapsular proveedor detrás de cliente server-only configurable y mapear errores controlados.                           |
| Video no tiene transcript nativo                                       | Mostrar estado claro y permitir probar otra URL; no inventar texto ni pedir transcript manual.                          |
| API key ausente, cuota agotada o respuesta `429`                       | No bloquear aplicación; mostrar indisponibilidad y conservar biblioteca existente.                                      |
| Transcript automático contiene errores, especialmente en canciones     | Sincronizar por segmentos recibidos, indicar que transcript puede contener errores y dejar correcciones para otra spec. |
| Video no permite embed, tiene restricciones regionales o requiere edad | Mantener transcript guardado si ya existe y mostrar error del player sin romper biblioteca.                             |
| Respuesta del proveedor contiene demasiados segmentos                  | Validar tamaño, cantidad y campos antes de guardar; rechazar payload inválido.                                          |
| Dos solicitudes simultáneas superan cuota o límite de biblioteca       | Usar operación atómica para cuota y clave primaria `(user_id, video_id)` para duplicados.                               |
| Posición se pierde al cerrar pestaña abruptamente                      | Guardar al pausar y salir; no prometer recuperación después de cierre forzado.                                          |
| RLS permite acceso cruzado entre usuarios                              | Aplicar políticas por `auth.uid()` y probar lecturas, escrituras y eliminaciones con usuarios distintos.                |
| Player externo comparte datos con YouTube                              | Desactivar autoplay, usar embed oficial y documentar dependencia en privacidad futura.                                  |
| Metadata no está disponible                                            | Guardar `videoId`, usar título de fallback y permitir abrir video aunque thumbnail falte.                               |
| Cambios de zona horaria confunden cuota diaria                         | Mostrar que límite usa UTC y devolver hora de próximo reinicio cuando se alcance.                                       |
| Base existente tiene esquema creado manualmente                         | Migración inicial usa sentencias idempotentes y se aplica con `supabase db push`; revisar historial remoto antes de producción. |

## Lo que **no** está en esta spec

- Integración con gateway de IA.
- Traducciones, ejemplos, explicaciones gramaticales y ejercicios.
- Sincronización palabra por palabra.
- Transcript pegado manualmente como fallback.
- Descarga, importación o almacenamiento de audio/video.
- Scraping o APIs no documentadas de YouTube.
- Transcripts en idiomas distintos de inglés.
- Playlists, búsqueda, recomendaciones y descubrimiento.
- Modo offline.
- Integración con monedas, misiones, racha, flashcards o repaso.
- Más de 20 videos por usuario.
- Eliminación automática de videos.
- Segundo proveedor de transcript.
- Cambio de proveedor desde UI.

Cada elemento queda para una spec posterior si se necesita.
