import type { Beat } from "../../types/beat"

export const mission03Beats: Beat[] = [
  {
    kind: "story",
    es: "Al día siguiente sales a buscar trabajo: necesitas encontrar la parada del bus.",
    en: "Hello! Where is the bus stop?",
    vocab: [
      ["where", "dónde"],
      ["bus stop", "parada del bus"],
    ],
  },
  {
    kind: "choice",
    prompt: "Estás perdido y quieres preguntar por un lugar. ¿Qué palabra usas?",
    options: ["Where", "Thanks", "Money"],
    correct: 0,
  },
  {
    kind: "story",
    es: "Un señor te responde y señala la calle.",
    en: "Go straight and turn left.",
    vocab: [
      ["straight", "recto"],
      ["left", "izquierda"],
    ],
  },
  {
    kind: "order",
    prompt: "Ordena la pregunta: «¿Dónde está la parada del bus?»",
    tokens: ["is", "Where", "bus", "the", "stop"],
    solution: ["Where", "is", "the", "bus", "stop"],
  },
  {
    kind: "story",
    es: "Llegas a la parada: está muy cerca de tu casa.",
    en: "It's near my home.",
    vocab: [["near", "cerca"]],
  },
  {
    kind: "type",
    prompt:
      "El señor no te entendió. Escribe en inglés: «¿Dónde está la parada del bus?»",
    accepted: ["where is the bus stop"],
    hint: "Where is the b__ s___",
  },
  {
    kind: "story",
    es: "El señor añade que no está lejos y señala a la derecha.",
    en: "It's not far. The bus stop is on the right.",
    vocab: [
      ["right", "derecha"],
      ["far", "lejos"],
    ],
  },
  {
    kind: "fill",
    prompt: "Completa lo que te dijo el señor.",
    sentence: "Go ___ and turn left.",
    answer: "straight",
  },
  {
    kind: "story",
    es: "Ya sabes moverte por el barrio. Mañana empiezas a buscar trabajo.",
    en: "Thanks! See you tomorrow.",
  },
]
