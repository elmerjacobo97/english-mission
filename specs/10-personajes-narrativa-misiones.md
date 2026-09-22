# SPEC 10 — Personajes y narrativa de misiones

> **Estado:** Implementado
> **Depende de:** SPEC 04 — Looks de Coco; SPEC 07 — Sonidos de juego
> **Fecha:** 2026-09-22
> **Objetivo:** Establecer un sistema de personajes y elenco por misión con retratos expresivos, presentaciones narrativas y vocabulario interactivo integrado en los diálogos.

## Alcance

**Dentro:**

- Ampliar el registro tipado de los diez personajes actuales con personalidad, motivación, relación con el estudiante, forma de hablar y función narrativa.
- Convertir a Coco en compañero y tutor narrativo desde esta spec, sin generar todavía respuestas con IA.
- Reemplazar el `cast` simple de las doce entradas de `plan.json` por un elenco estructurado con `character`, `function` y `objective`.
- Limitar cada misión a Coco como tutor y uno o dos personajes narrativos con función principal o de apoyo.
- Rediseñar los diez avatares como retratos vectoriales dinámicos de estilo editorial amigable.
- Conservar los estados `neutral`, `happy`, `surprised`, `sad` y `curious`.
- Conservar los cinco looks equipables de Coco y su aplicación en todos los tamaños del avatar.
- Incorporar una variante protagonista del retrato para los beats narrativos y mantener una variante compacta en desafíos, repaso, tienda y otras superficies.
- Presentar a cada personaje mediante una tarjeta cuando aparece por primera vez durante una ejecución de la misión.
- Restablecer las presentaciones al reiniciar o repetir la misión, sin guardarlas en `Progress`.
- Mostrar el personaje activo, su expresión y su diálogo con mayor jerarquía dentro de `StoryBeat`.
- Eliminar los chips de vocabulario situados debajo de los diálogos.
- Convertir las palabras y frases declaradas en `beat.vocab` en controles interactivos dentro del texto inglés.
- Abrir un popover accesible con traducción y reproducción de audio al activar una palabra o frase.
- Respetar el estado global de silencio y continuar mostrando la traducción cuando `SpeechSynthesis` no esté disponible.
- Reubicar las asociaciones `beat.vocab` que ya coincidan con otro diálogo narrativo.
- Ajustar mínimamente ocho diálogos de las misiones 2, 4, 5, 6 y 7 para incorporar `buy`, `bill`, `time`, `single`, `coin`, `dress`, `expensive` y `cheap`.
- Conservar la trama, los retos, el orden y la cantidad de beats durante esos ajustes.
- Validar que cada vocabulario interactivo aparezca literalmente en su texto inglés y que cada personaje utilizado pertenezca al elenco estructurado.
- Agregar pruebas de perfiles, elencos, retratos, presentaciones, vocabulario interactivo, teclado y degradación sin audio.

**Fuera de alcance:**

- Conectar a Coco con el gateway de IA de SPEC 08.
- Crear endpoint autenticado, cuota de uso, historial o persistencia para el tutor.
- Chat libre, respuestas automáticas o evaluación generada por IA.
- Reescribir la trama, la estructura narrativa, los retos o la progresión pedagógica de las misiones; solo se permiten los ocho ajustes léxicos enumerados.
- Escribir las misiones 9–12, que continúan marcadas como `written: false`.
- Agregar, eliminar o renombrar personajes y ocupaciones.
- Crear una galería o ruta independiente de personajes.
- Ilustraciones rasterizadas, archivos SVG estáticos o escenas completas por beat.
- Persistir qué personajes ya fueron presentados.
- Modificar la versión 6 de `Progress`, sus tablas de Supabase o sus reglas de sincronización.
- Cambiar recompensas, estrellas, monedas, dificultad, repaso o Cuaderno.
- Sustituir `SpeechSynthesis` por voces grabadas o un proveedor externo.
- Permitir looks o accesorios comprables para personajes distintos de Coco.

## Modelo de datos

### Perfiles de personajes

`CharacterConfig` se separará en identidad narrativa y configuración visual. El registro seguirá siendo TypeScript ejecutable.

```ts
// src/shared/lib/game/types/character.ts

export type CharacterId = 'coco' | 'marta' | 'nico' | 'beto' | 'cami' | 'chofer' | 'rosa' | 'sergio' | 'sofia' | 'tere';

export type CharacterVisual = {
  species: Species;
  skin: string;
  hair: string;
  shirt: string;
  background: string;
  hairStyle: HairStyle;
  accessory: Accessory;
};

export type CharacterProfile = {
  name: string;
  role: string;
  definingTrait: string;
  personality: string;
  motivation: string;
  relationship: string;
  speechStyle: string;
  narrativeFunction: string;
  visual: CharacterVisual;
};

export const CHARACTERS: Record<CharacterId, CharacterProfile>;
```

Contenido narrativo del registro:

| Personaje     | Rasgo principal | Personalidad y motivación                                                             | Relación y función narrativa                                         | Forma de hablar                                                                        |
| ------------- | --------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Coco**      | Curioso         | Entusiasta, paciente y juguetón; quiere que el estudiante gane autonomía.             | Compañero y tutor que acompaña toda la historia.                     | Español breve y alentador; modela inglés claro sin resolver el reto por el estudiante. |
| **Marta**     | Acogedora       | Práctica y protectora; quiere que el recién llegado se adapte al barrio.              | Vecina y primera aliada que conecta al estudiante con oportunidades. | Cercana, directa y tranquilizadora.                                                    |
| **Nico**      | Ingenioso       | Enérgico y servicial; quiere ayudar a sus clientes a decidir con confianza.           | Vendedor del mercado que introduce intercambios cotidianos.          | Rápida, concreta y amistosa.                                                           |
| **Don Beto**  | Paciente        | Observador y generoso; disfruta orientar a quienes no conocen el barrio.              | Vecino mayor que enseña a ubicarse en la ciudad.                     | Pausada, clara y basada en referencias sencillas.                                      |
| **Cami**      | Sociable        | Atenta y optimista; quiere que cada persona se sienta bienvenida.                     | Chica del café que facilita conversaciones sociales.                 | Cálida, natural y expresiva.                                                           |
| **El chofer** | Preciso         | Responsable y ordenado; quiere que los pasajeros lleguen sin confundirse.             | Chofer del bus que introduce rutas, horarios y boletos.              | Breve, informativa y sin rodeos.                                                       |
| **Rosa**      | Metódica        | Paciente y resolutiva; quiere que la lavandería funcione sin complicaciones.          | Encargada de la lavandería que guía procesos cotidianos.             | Secuencial, práctica y amable.                                                         |
| **Sergio**    | Responsable     | Pragmático y confiable; quiere mantener el departamento en buenas condiciones.        | Dueño del departamento que introduce llamadas y acuerdos.            | Serena, concreta y orientada a soluciones.                                             |
| **Sofía**     | Exigente        | Profesional y justa; busca personas responsables para su equipo.                      | Jefa que introduce el entorno laboral y sus expectativas.            | Formal, clara y respetuosa.                                                            |
| **Tere**      | Colaborativa    | Extrovertida y solidaria; quiere integrar al estudiante al equipo y a la vida social. | Compañera de trabajo que conecta empleo, amistad y pertenencia.      | Conversacional, espontánea y alentadora.                                               |

La tarjeta de primera aparición utilizará `name`, `relationship` y `definingTrait`. Los demás campos funcionarán como contrato editorial para escribir y revisar misiones.

### Elenco por misión

```ts
// src/shared/lib/game/types/mission.ts

export type MissionCharacterFunction = 'tutor' | 'primary' | 'support';

export type MissionCastMember = {
  character: CharacterId;
  function: MissionCharacterFunction;
  objective: string;
};

export type MissionPlanEntry = {
  // Campos existentes…
  cast: MissionCastMember[];
};
```

Ejemplo para `directions`:

```json
{
  "cast": [
    {
      "character": "coco",
      "function": "tutor",
      "objective": "Ayudarte a preparar y recordar la pregunta principal."
    },
    {
      "character": "beto",
      "function": "primary",
      "objective": "Darte indicaciones claras para encontrar la parada."
    },
    {
      "character": "marta",
      "function": "support",
      "objective": "Conectar la búsqueda de la parada con la oportunidad de trabajo."
    }
  ]
}
```

Invariantes:

- Cada misión declara exactamente un `tutor`, y siempre es Coco.
- Cada misión declara uno o dos personajes adicionales.
- Cada personaje usado por un beat pertenece al `cast` de la misión.
- `objective` describe su función dentro de esa misión, no su biografía global.
- Las doce entradas del plan reciben el formato nuevo, aunque las misiones 9–12 continúen sin beats escritos.

### Retratos

```ts
export type AvatarVariant = 'compact' | 'portrait';

export type CharacterAvatarProps = {
  character: CharacterId;
  mood?: Mood;
  variant?: AvatarVariant;
  size?: number;
  lookId?: CocoLookId;
  className?: string;
};
```

Convenciones:

- `compact` conserva el contrato necesario para usos entre 20 y 96 píxeles.
- `portrait` muestra un busto más grande en beats narrativos.
- Ambas variantes se generan con SVG desde el mismo `CharacterVisual`.
- Los cinco looks de Coco reemplazan únicamente colores compatibles con el contrato actual.
- Los estados de ánimo funcionan en ambas variantes.

### Presentaciones durante una ejecución

```ts
type MissionPresentationState = {
  introducedCharacters: Set<CharacterId>;
};
```

Este estado vive únicamente dentro de la ejecución de `MissionPlayer`:

- Un personaje se agrega al conjunto cuando aparece por primera vez.
- Su primera aparición muestra `CharacterIntroduction`.
- Reiniciar o volver a abrir la misión crea un conjunto vacío.
- No se agrega ningún campo a `Progress` ni a Supabase.

### Vocabulario interactivo

`Vocabulary` y el JSON de los beats conservan su forma actual:

```ts
export type Vocabulary = [en: string, es: string];

type InteractiveTextSegment =
  | {
      kind: 'text';
      text: string;
    }
  | {
      kind: 'vocabulary';
      text: string;
      en: string;
      es: string;
    };

export function segmentInteractiveVocabulary(text: string, vocabulary: Vocabulary[]): InteractiveTextSegment[];
```

Reglas del segmentador:

- Busca coincidencias literales sin distinguir mayúsculas y minúsculas.
- Conserva exactamente las mayúsculas y la puntuación del diálogo original.
- Prioriza la frase más larga cuando dos entradas se superponen.
- Convierte todas las coincidencias no superpuestas en controles interactivos.
- Aplica límites de palabra a términos alfanuméricos para no encontrar, por ejemplo, `no` dentro de `not`.
- Un beat con `vocab` que no aparece en su propio `en` falla en la validación curricular.
- Solo puede existir un popover de vocabulario abierto a la vez.
- El popover muestra `en`, `es` y el control de audio cuando la voz está disponible.
- Silenciar o no disponer de voz elimina la acción de audio, pero no la traducción.
- Los chips actuales dejan de renderizarse.
- No se incorporan marcas HTML ni offsets manuales en los archivos JSON.

## Plan de implementación

### Grupo 1 — Biblia tipada de personajes

- [x] 1.1 Reestructurar `src/shared/lib/game/types/character.ts` para separar `CharacterProfile` y `CharacterVisual`, agregar los campos narrativos aprobados y conservar `CharacterId`, `Mood`, `Species`, `HairStyle` y `Accessory`.
- [x] 1.2 Migrar Coco, Marta, Nico, Don Beto y Cami en `src/shared/lib/game/content/characters.ts` al nuevo contrato con su perfil narrativo completo.
- [x] 1.3 Migrar El chofer, Rosa, Sergio, Sofía y Tere al mismo contrato sin cambiar sus nombres ni ocupaciones.
- [x] 1.4 Crear pruebas del registro que exijan los diez identificadores, campos narrativos no vacíos, configuración visual completa y Coco definido como compañero y tutor.

### Grupo 2 — Elenco estructurado por misión

- [x] 2.1 Agregar `MissionCharacterFunction` y `MissionCastMember` en `src/shared/lib/game/types/mission.ts`; cambiar `MissionPlanEntry.cast` de `CharacterId[]` a `MissionCastMember[]`.
- [x] 2.2 Migrar el elenco de las cuatro misiones del capítulo 1 en `src/shared/lib/curriculum/plan.json`, asignando función y objetivo concreto a cada personaje.
- [x] 2.3 Migrar los capítulos 2 y 3; mantener `written: false` y el resto del contenido sin cambios en las misiones 9–12.
- [x] 2.4 Adaptar `missionCharacters` y las pruebas de `curriculum.test.ts` para exigir un solo tutor Coco, uno o dos personajes adicionales, funciones válidas, objetivos no vacíos y pertenencia de cada personaje usado al elenco declarado.

### Grupo 3 — Retratos vectoriales dinámicos

- [x] 3.1 Adaptar `CharacterAvatar` al nuevo `CharacterVisual` y agregar las variantes `compact` y `portrait` sin romper sus consumidores actuales.
- [x] 3.2 Rediseñar el retrato humano con siluetas, peinados, accesorios y rasgos distinguibles en tamaños pequeños, manteniendo los cinco estados de ánimo.
- [x] 3.3 Rediseñar el retrato de Coco para ambas variantes y conservar la aplicación de los looks `classic`, `ocean`, `sunset`, `night` y `party`.
- [x] 3.4 Ampliar `character-avatar.test.tsx` para cubrir los diez personajes, ambas variantes, expresiones, nombre accesible, tamaño personalizado y compatibilidad con los looks de Coco.

### Grupo 4 — Presencia narrativa y primera aparición

- [x] 4.1 Crear `src/shared/components/game/character-introduction.tsx` para mostrar nombre, relación y rasgo principal sin agregar un paso adicional a la misión.
- [x] 4.2 Incorporar a la ejecución de `MissionPlayer` el conjunto efímero de personajes presentados; mostrar la tarjeta sobre el primer beat de cada personaje y limpiarlo al reiniciar.
- [x] 4.3 Rediseñar `StoryBeat` para usar el retrato `portrait`, dar jerarquía al personaje activo y mantener el avatar `compact` en los componentes de desafío.
- [x] 4.4 Cubrir en `mission-player.test.tsx` y `story-beat.test.tsx` la primera aparición, navegación hacia atrás, repetición, reinicio, beats sin personaje y ausencia de mutaciones en `Progress`.

### Grupo 5 — Vocabulario dentro del diálogo

- [x] 5.1 Crear un segmentador compartido para coincidencias literales, insensibles a mayúsculas, no superpuestas y ordenadas por la frase más larga; cubrir texto, puntuación, repetición y términos solapados con pruebas unitarias.
- [x] 5.2 Ajustar los ocho diálogos acordados en las misiones 2, 4, 5, 6 y 7; conservar trama, retos, orden y cantidad de beats.
- [x] 5.3 Endurecer `curriculum.test.ts` para exigir que cada entrada de `story.vocab` aparezca en el `story.en` del mismo beat y mantener las validaciones curriculares existentes.
- [x] 5.4 Crear `InteractiveVocabulary` con un único popover accesible, traducción, reproducción mediante la capa de voz existente, cierre con `Escape` y devolución del foco al activador.
- [x] 5.5 Integrar `InteractiveVocabulary` en `StoryBeat`, eliminar la lista de chips y ampliar `story-beat.test.tsx` para teclado, audio, silencio, falta de `SpeechSynthesis` y diálogos sin vocabulario.

## Criterios de aceptación

- [x] `CHARACTERS` contiene exactamente los diez `CharacterId` actuales.
- [x] Cada personaje declara nombre, rol, rasgo principal, personalidad, motivación, relación con el estudiante, forma de hablar, función narrativa y configuración visual.
- [x] Coco queda definido como compañero y tutor narrativo del estudiante.
- [x] Los nombres y ocupaciones de Marta, Nico, Don Beto, Cami, El chofer, Rosa, Sergio, Sofía y Tere no cambian.
- [x] Las doce entradas de `plan.json` usan `MissionCastMember[]` en lugar de una lista de identificadores.
- [x] Cada misión declara exactamente un miembro con función `tutor`, y ese miembro es Coco.
- [x] Cada misión declara uno o dos personajes adicionales con función `primary` o `support`.
- [x] Cada miembro del elenco tiene un `objective` no vacío y específico para la misión.
- [x] Todo personaje utilizado por un beat pertenece al elenco declarado de su misión.
- [x] Las misiones 9–12 conservan `written: false`.
- [x] `CharacterAvatar` admite las variantes `compact` y `portrait`.
- [x] Los diez personajes tienen rasgos vectoriales distinguibles sin depender únicamente del color.
- [x] Los estados `neutral`, `happy`, `surprised`, `sad` y `curious` funcionan en las dos variantes.
- [x] Los cinco looks de Coco continúan cambiando sus colores aprobados sin modificar su piel verde.
- [x] Los usos existentes de avatares compactos en desafíos, repaso, tienda y notas gramaticales continúan funcionando.
- [x] La primera aparición muestra el retrato protagonista; los beats siguientes identifican al hablante en la línea, sin repetir la ficha.
- [x] La primera aparición de cada personaje durante una ejecución muestra una tarjeta con nombre, relación y rasgo principal.
- [x] La presentación no agrega un beat ni modifica el total de pasos de la misión.
- [x] Volver a un beat anterior no repite una presentación ya vista durante la misma ejecución.
- [x] Reiniciar o volver a abrir la misión permite mostrar nuevamente sus presentaciones.
- [x] Las presentaciones no escriben en `Progress`, Supabase ni almacenamiento del navegador.
- [x] Los chips de vocabulario dejan de aparecer debajo de los diálogos.
- [x] Cada palabra o frase de `story.vocab` se presenta como control interactivo dentro de `story.en`.
- [x] Las coincidencias conservan las mayúsculas y la puntuación visibles del diálogo.
- [x] Los términos solapados priorizan la frase más larga y no duplican fragmentos.
- [x] Activar una palabra mediante mouse, tacto, `Enter` o barra espaciadora abre un único popover con inglés y traducción.
- [x] `Escape` cierra el popover y devuelve el foco a la palabra que lo abrió.
- [x] El popover permite reproducir la palabra o frase mediante la capa de voz existente cuando está disponible y no silenciada.
- [x] Con audio silenciado o `SpeechSynthesis` ausente, la traducción sigue disponible y la misión continúa sin errores.
- [x] `buy`, `bill`, `time`, `single`, `coin`, `dress`, `expensive` y `cheap` aparecen de forma natural en un diálogo narrativo de su misión.
- [x] Los ajustes léxicos no cambian la trama, los retos, el orden ni la cantidad de beats.
- [x] La validación curricular falla si una entrada de `story.vocab` no aparece en el `story.en` del mismo beat.
- [x] Continúan cumpliéndose los límites de vocabulario, cantidad de beats, retos, reciclaje, notas gramaticales, dificultad, español neutro y consistencia del elenco.
- [x] `Progress` conserva la versión 6 y no se agregan migraciones de Supabase.
- [x] No se llama al gateway de IA ni se agrega endpoint, cuota, historial o chat para Coco.
- [x] `rtk pnpm lint`, `rtk tsc --noEmit`, `rtk pnpm test` y `rtk pnpm build` finalizan correctamente.
## Decisiones

- **Sí:** dividir la iniciativa en tres specs: base narrativa y personajes, tutor IA y reescritura progresiva de misiones. Cada una tiene una frontera técnica y editorial diferente.
- **Sí:** SPEC 10 cubre únicamente la base narrativa, el elenco, los retratos, las presentaciones y el vocabulario contextual.
- **No:** implementar el tutor IA en esta spec. Requiere endpoint autenticado, cuota, estados de error y degradación propios.
- **Sí:** Coco pasa a ser compañero y tutor narrativo desde ahora. La siguiente spec agregará sus capacidades de IA.
- **No:** crear una mascota nueva o permitir elegir entre varias. Coco ya conecta misiones, tienda y looks.
- **Sí:** mantener los diez personajes, nombres y ocupaciones actuales. Se profundiza su identidad sin reiniciar el elenco.
- **Sí:** guardar la biblia de personajes en un registro TypeScript tipado. Permite que las pruebas validen el contrato editorial y visual.
- **No:** duplicar los perfiles en archivos Markdown o JSON separados. Crearía dos fuentes de verdad.
- **Sí:** declarar el elenco de cada misión mediante personaje, función y objetivo. Una lista de identificadores no explica para qué participa cada personaje.
- **Sí:** Coco es el único tutor de cada misión; uno o dos personajes adicionales cumplen funciones principales o de apoyo.
- **No:** declarar números de entrada y salida en `plan.json`. Esa información ya se deriva de los beats y sería frágil ante cambios editoriales.
- **Sí:** rediseñar los avatares como retratos vectoriales dinámicos de estilo editorial amigable.
- **No:** usar PNG, WebP, SVG estáticos o escenas ilustradas completas. Multiplicarían assets y variantes para personajes, expresiones y looks.
- **Sí:** conservar una variante compacta y agregar una variante protagonista. Los desafíos necesitan menos carga visual que la narración.
- **Sí:** preservar los cinco estados de ánimo y los cinco looks existentes de Coco.
- **Sí:** mostrar la presentación de un personaje una vez por ejecución, integrada en su primer beat y sin sumar un paso.
- **No:** persistir las presentaciones vistas. Repetir una misión debe conservar su contexto narrativo y `Progress` no necesita otra versión.
- **Sí:** reemplazar los chips por palabras y frases interactivas dentro del diálogo. La ayuda queda vinculada al contexto donde se usa el inglés.
- **Sí:** reutilizar `Vocabulary` y buscar coincidencias literales sin distinguir mayúsculas. Evita agregar offsets o marcado HTML a los JSON.
- **Sí:** priorizar la frase más larga cuando existan términos solapados.
- **No:** hacer interactivo el texto de todos los desafíos. Añadiría ruido a la actividad y ampliaría cada tipo de reto.
- **Sí:** ajustar mínimamente ocho diálogos para incorporar vocabulario que actualmente solo aparece en desafíos.
- **No:** eliminar esas ocho asociaciones. Las palabras deben conservar una aparición contextual durante la narración.
- **No:** realizar una reescritura narrativa completa en esta spec. La trama, estructura, retos y progresión se abordarán en la tercera spec.
- **Sí:** reutilizar `SpeechSynthesis` y el control global de silencio existentes.
- **No:** agregar voces grabadas, proveedores externos, datos persistentes o cambios en Supabase.

## Riesgos

| Riesgo                                                                                       | Mitigación                                                                                                                                                         |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| El cambio de `cast` rompe consumidores que esperan `CharacterId[]`.                          | Migrar los tipos y helpers antes de modificar `plan.json`; usar una función común para obtener los identificadores del elenco y ejecutar typecheck tras el grupo.  |
| La biblia narrativa se convierte en información decorativa que el contenido no respeta.      | Usar el registro ejecutable en las tarjetas y agregar validaciones de campos, elenco y objetivos; la futura reescritura debe consumir este contrato.               |
| Los retratos pierden legibilidad en tamaños pequeños.                                        | Diseñar primero la variante `compact`, distinguir personajes por silueta y rasgos además del color, y probar tamaños entre 20 y 96 píxeles.                        |
| El nuevo retrato de Coco rompe looks comprados.                                              | Mantener una única configuración visual base y aplicar los colores equipados sobre propiedades estables cubiertas por pruebas.                                     |
| Los SVG más complejos aumentan demasiado el marcado o el costo de renderizado.               | Compartir primitivas entre variantes, evitar assets duplicados y limitar los detalles invisibles en `compact`.                                                     |
| Una presentación se repite al navegar hacia atrás o desaparece incorrectamente al reiniciar. | Mantener el conjunto dentro de la ejecución, registrar al personaje al consumir su primera aparición y cubrir avance, retroceso y reinicio.                        |
| El resaltado encuentra `no` dentro de `not` u otras coincidencias parciales.                 | Aplicar límites de palabra a términos alfanuméricos y agregar casos como `no`/`not` a las pruebas del segmentador.                                                 |
| Dos términos se superponen o una frase aparece varias veces.                                 | Ordenar por longitud, consumir intervalos no superpuestos y preservar todas las repeticiones válidas.                                                              |
| El popover sale de la pantalla o rompe el flujo en texto multilínea.                         | Anclarlo al activador, limitar su ancho al viewport y verificarlo en disposiciones móviles y de escritorio.                                                        |
| El popover deja el foco perdido al cerrarse o produce HTML inválido dentro del párrafo.      | Mantener el contenido flotante fuera del párrafo visual, conectar activador y panel con atributos ARIA y devolver el foco explícitamente.                          |
| Los ocho ajustes léxicos afectan dificultad, reciclaje o naturalidad.                        | Limitar cada cambio a la frase inglesa necesaria y ejecutar toda la validación curricular, no únicamente la nueva regla inline.                                    |
| Audio silenciado o no compatible deja un control inútil.                                     | Consultar la capa de voz existente antes de mostrar la acción; la traducción siempre funciona sin audio.                                                           |
| Las pruebas estructurales no detectan problemas visuales del rediseño.                       | Complementar las pruebas automatizadas con revisión manual de los diez personajes, las dos variantes, los cinco estados y los looks de Coco en móvil y escritorio. |

## Lo que **no** entra en esta spec

- Tutor conectado al gateway de IA.
- Endpoint para estudiantes, cuota, historial o persistencia de conversaciones.
- Chat libre o intervenciones automáticas de Coco.
- Reescritura completa de misiones; solo entran los ocho ajustes léxicos acordados.
- Escritura de las misiones 9–12.
- Personajes nuevos, cambios de nombre u ocupación y mascotas elegibles.
- Galería o ruta independiente de personajes.
- Imágenes rasterizadas, SVG estáticos o escenas ilustradas completas.
- Persistencia de presentaciones vistas.
- Cambios en `Progress`, Supabase, recompensas, dificultad, repaso o Cuaderno.
- Vocabulario interactivo dentro de los componentes de desafío.
- Voces grabadas o proveedores externos de audio.
- Looks comprables para personajes distintos de Coco.

Cada elemento, si se implementa, debe entrar en una spec posterior.
