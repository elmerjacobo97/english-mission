# SPEC 14 — Ensayo de situaciones reales con Coco

> **Estado:** Implementado
> **Depende de:** SPEC 06 — Progreso en Supabase; SPEC 08 — Gateway de IA configurable; SPEC 11 — Rutas de aprendizaje por nivel CEFR
> **Fecha:** 2026-09-23
> **Objetivo:** Permitir ensayar situaciones personales en inglés mediante conversaciones de cinco respuestas con un interlocutor simulado por Coco, con retroalimentación final e historial sincronizado entre dispositivos.

## Alcance

**Dentro:**

- Crear sección **Ensayar**, donde describes en español o inglés una situación y el objetivo que quieres conseguir. Coco presenta escenario, papel que interpretará y objetivo antes de comenzar.
- Practicar por texto con inglés adaptado a tu ruta CEFR. Coco inicia; después de cinco respuestas tuyas, termina el ensayo. Puedes terminar antes.
- Ofrecer **Dame una pista** con ayuda breve en español y una frase inicial en inglés. Las pistas no cuentan como respuestas. Coco mantiene su papel sin interrumpir con correcciones.
- Mostrar retroalimentación final en español: objetivo logrado, parcialmente logrado o no logrado, con evidencia de la conversación; hasta dos correcciones y opción de repetir con una variación. Si faltan respuestas para evaluar, indicarlo.
- Guardar escenario, conversación y resultado en Supabase por cuenta. Permitir retomar un ensayo pendiente, consultar ensayos anteriores y eliminarlos desde cualquier dispositivo. Ante errores de IA, conservar conversación y ofrecer reintento.

**Fuera de alcance:**

- Voz, micrófono y evaluación de pronunciación.
- Monedas, estrellas, rachas o cambios al progreso de misiones por completar ensayos.
- Certificación CEFR o puntuaciones que pretendan medir dominio general del inglés.
- Convertir errores automáticamente en ejercicios de repaso.
- Compartir ensayos con otras personas o usarlos sin conexión.

Repetir crea un ensayo nuevo y conserva el anterior para consultarlo.

## Modelo de datos

Una tabla nueva, `public.rehearsal_sessions`, guarda cada ensayo completo. Cinco respuestas por conversación permiten mantener mensajes y resultado juntos.

```ts
type RehearsalMessage = {
  id: string;
  kind: 'user_reply' | 'character_reply' | 'hint';
  content: string;
};

type RehearsalFeedback = {
  outcome: 'achieved' | 'partially_achieved' | 'not_achieved' | 'insufficient_evidence';
  explanation: string;
  corrections: {
    original: string;
    corrected: string;
    reason: string;
  }[]; // Máximo dos; vacío si no hay errores que corregir.
};

type RehearsalSession = {
  id: string;
  user_id: string;
  situation: string; // Situación descrita por el estudiante.
  objective: string; // Objetivo confirmado antes de comenzar.
  character_role: string; // Papel que interpreta Coco.
  course_band: 'basic' | 'intermediate' | 'advanced';
  status: 'ready' | 'in_progress' | 'completed';
  messages: RehearsalMessage[];
  feedback: RehearsalFeedback | null;
  source_session_id: string | null; // Ensayo original al repetir.
  created_at: string;
  updated_at: string;
};
```

### Reglas

1. **Propiedad:** cada ensayo pertenece a una cuenta. RLS restringe lectura, creación, modificación y borrado a su propietario.
2. **Duración:** contar únicamente mensajes `user_reply`. Máximo cinco; pistas y respuestas de Coco no consumen turnos.
3. **Estados:** `ready` permite revisar escenario antes de comenzar; `in_progress` permite conversar o retomar; `completed` conserva resultado final.
4. **Cierre y errores:** marcar `completed` solo cuando exista retroalimentación válida. Si falla generación final, conservar respuestas y permitir reintentar sin pedir un sexto turno.
5. **Repetición:** crear otro registro con `source_session_id`. Borrar ensayo original no elimina repeticiones; referencia pasa a `null`.

El nivel queda guardado al crear el ensayo. Cambiar después de ruta CEFR no altera conversaciones anteriores. Carga y errores temporales permanecen en interfaz, no en base de datos.

## Plan de implementación

### Grupo 1 — Guardado y acceso por cuenta

- [x] 1.1 Crear migración de `rehearsal_sessions` con estados, mensajes, retroalimentación y referencia opcional al ensayo original.
- [x] 1.2 Configurar RLS por propietario y conservar repeticiones cuando se elimine el ensayo original.
- [x] 1.3 Crear tipos y repositorio en `src/features/rehearsal/` para crear, consultar, actualizar y eliminar ensayos.
- [x] 1.4 Verificar aislamiento entre cuentas, restauración de mensajes y eliminación independiente de repeticiones.

### Grupo 2 — Conversación y evaluación con IA

- [x] 2.1 Mover acceso a cuota desde `src/features/tutor/server/tutor-usage.server.ts` a un módulo compartido. Mantener comportamiento del tutor y verificar cuota conjunta.
- [x] 2.2 Crear servicio server-only de ensayo: preparar escenario, interpretar personaje, ofrecer pistas y generar retroalimentación mediante gateway existente.
- [x] 2.3 Agregar endpoints autenticados en `src/app/api/rehearsals/`. Validar entradas y obtener conversación, propietario y nivel desde servidor.
- [x] 2.4 Guardar respuestas antes de generar continuación; impedir turnos duplicados o sobrescrituras por solicitudes simultáneas. Reintentar generación fallida sin agregar otra respuesta del estudiante.
- [x] 2.5 Verificar cinco respuestas máximas, pistas sin consumo de turnos, cierre anticipado, cuota agotada y recuperación de fallos.

### Grupo 3 — Ensayo completo desde interfaz

- [x] 3.1 Crear `/rehearsals` con `PageHeader`, formulario de situación y objetivo, y revisión de escenario antes de comenzar.
- [x] 3.2 Crear `/rehearsals/[id]` con conversación, indicador de turnos, **Dame una pista** y **Terminar ensayo**.
- [x] 3.3 Mostrar carga, error, reintento y cuota agotada; recuperar conversación guardada al recargar.
- [x] 3.4 Mostrar resultado con evidencia y hasta dos correcciones; indicar cuando falten respuestas para evaluar.
- [x] 3.5 Agregar **Ensayar** a `AppShell` y verificar flujo completo con navegación por teclado y diseño móvil.

### Grupo 4 — Historial y repetición

- [x] 4.1 Mostrar ensayos de la cuenta en `/rehearsals`, ordenados por actividad reciente y diferenciados por estado.
- [x] 4.2 Permitir retomar pendientes y consultar conversaciones completadas desde otro dispositivo.
- [x] 4.3 Agregar eliminación con confirmación y manejo de errores.
- [x] 4.4 Agregar **Repetir con una variación**: crear otro ensayo, conservar objetivo y original, y presentar escenario nuevo antes de comenzar.

Cada generación exitosa de escenario, intervención, pista o evaluación consume cuota. Consultar historial y reabrir un ensayo no consumen cuota. Tutor y ensayos comparten 50 generaciones exitosas diarias por cuenta, con reinicio UTC.

**Verificación final:** lint, typecheck, tests y build; prueba manual con dos cuentas y dos dispositivos.

## Criterios de aceptación

### 1. Preparar un ensayo

- [x] **Ensayar** aparece en navegación y abre `/rehearsals`.
- [x] El estudiante puede describir situación y objetivo en español o inglés.
- [x] Antes de comenzar, se muestran escenario, personaje y objetivo. El nivel se obtiene de la ruta CEFR de la cuenta.

### 2. Practicar y terminar

- [x] Coco inicia conversación en inglés y mantiene el papel asignado.
- [x] Cada respuesta enviada por el estudiante consume un turno; pistas e intervenciones de Coco no consumen turnos.
- [x] Después de cinco respuestas, no se permite enviar una sexta y se genera retroalimentación.
- [x] **Terminar ensayo** permite cerrar antes; sin evidencia suficiente, el resultado lo indica.
- [x] **Dame una pista** ofrece ayuda en español y una frase inicial en inglés, sin interrumpir el ensayo con correcciones.

### 3. Recibir retroalimentación y repetir

- [x] El resultado indica objetivo logrado, parcialmente logrado, no logrado o evidencia insuficiente, con explicación basada en la conversación.
- [x] Se muestran hasta dos correcciones con frase original, corrección y motivo; no se fuerzan correcciones cuando no corresponden.
- [x] **Repetir con una variación** crea otro ensayo y permite revisar escenario antes de comenzar, conservando ensayo original.

### 4. Guardar y recuperar

- [ ] Recargar o abrir otro dispositivo con la misma cuenta permite retomar ensayo guardado.
- [x] Historial muestra ensayos por actividad reciente y permite consultar conversaciones y resultados.
- [ ] Eliminar requiere confirmación; borrar original no elimina repeticiones.
- [ ] Una cuenta no puede consultar, modificar ni eliminar ensayos de otra, incluso mediante solicitudes directas.

### 5. Manejar límites y fallos

- [x] Tutor y ensayos comparten límite de 50 generaciones exitosas por día UTC; fallos y consultas al historial no consumen cuota.
- [x] Cuota agotada conserva conversación e informa cuándo puede retomarse.
- [x] Fallos de IA o guardado muestran error y permiten reintentar sin duplicar turnos ni perder respuestas ya guardadas.
- [x] Solicitudes simultáneas no sobrescriben conversación ni permiten superar cinco respuestas.
- [ ] Flujo funciona con teclado y en móvil; lint, typecheck, tests y build pasan.

El comportamiento educativo de Coco se revisará con conversaciones representativas; las pruebas automáticas verificarán contratos, estados y límites.

## Decisiones

1. **Sección propia para ensayos.** Permite practicar situaciones personales sin entrar a una misión. Se reutilizan gateway de IA y cuota compartida; el panel del tutor conserva su función de resolver dudas.
2. **Conversación por texto con cinco respuestas del estudiante.** Mantiene práctica breve y cierre definido. Se permite terminar antes y pedir pistas sin consumir turnos. Voz y micrófono quedan para otra spec.
3. **Coco interpreta durante el ensayo y corrige al terminar.** Prioriza comunicación sin interrupciones constantes. La evaluación se refiere al objetivo concreto; no certifica nivel CEFR ni modifica resultados del juego.
4. **Historial sincronizado en Supabase por cuenta.** Guarda escenario, mensajes y resultado juntos por ensayo. Permite retomar entre dispositivos; almacenamiento exclusivamente local no satisface alcance elegido. Repetir crea otro registro y conserva original.
5. **Cuota conjunta de 50 generaciones exitosas por día UTC.** Escenarios, intervenciones, pistas y evaluaciones comparten límite con tutor. Consultar historial no consume cuota. Al agotarse, se conserva ensayo pendiente; no se reserva cuota para garantizar terminarlo ese día.

## Riesgos

1. **Coco abandona personaje o evalúa incorrectamente.** Separar instrucciones de conversación y evaluación. Exigir evidencia de mensajes reales; validar comportamiento con escenarios representativos. No presentar resultado como certificación.
2. **Cuota se agota antes de evaluación final.** Conservar ensayo pendiente e informar reinicio diario UTC. Permitir solicitar evaluación después sin agregar otro turno.
3. **IA responde, pero falla guardado.** No mostrar avance como confirmado hasta persistirlo. Identificar cada operación para que reintentos no dupliquen mensajes ni cobren nuevamente una generación ya registrada.
4. **Dos dispositivos modifican mismo ensayo.** Comprobar versión del registro antes de guardar. Rechazar actualización desfasada y recuperar conversación vigente, sin sobrescribir respuestas.
5. **Situación incluye información personal o laboral sensible.** Avisar que contenido se envía al proveedor de IA configurado. Enviar solo contexto necesario para ensayo, sin correo ni otros datos de cuenta; permitir eliminar historial guardado en la app.

## Lo que **no** entra en esta spec

- Voz, micrófono y evaluación de pronunciación.
- Monedas, estrellas, rachas o cambios al progreso de misiones por completar ensayos.
- Certificación CEFR o puntuaciones de dominio general del inglés.
- Conversión automática de errores en ejercicios de repaso.
- Compartir ensayos con otras personas o usarlos sin conexión.

Cada elemento, si se implementa, debe entrar en una spec posterior.
