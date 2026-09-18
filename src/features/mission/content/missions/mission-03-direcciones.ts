import type { Beat } from "../../types/beat"

export const mission03Beats: Beat[] = [
  {
    kind: "story",
    es: "Marta te dijo que hay trabajo al otro lado del barrio. Sales temprano a buscar la parada del bus.",
    en: "Hello! Where is the bus stop?",
    speaker: "you",
    vocab: [
      ["where", "dónde"],
      ["bus stop", "parada del bus"],
    ],
    character: "marta",
  },
  {
    kind: "choice",
    prompt: "Estás perdido y quieres preguntar por un lugar. ¿Qué palabra usas?",
    options: ["Where", "Thanks", "Money"],
    correct: 0,
    character: "coco",
    mood: "curious",
  },
  {
    kind: "story",
    es: "Un señor mayor te responde y señala la calle.",
    en: "Go straight and turn left.",
    speaker: "beto",
    vocab: [
      ["straight", "derecho"],
      ["left", "izquierda"],
    ],
    character: "beto",
    mood: "happy",
  },
  {
    kind: "order",
    prompt: "Ordena la pregunta: «¿Dónde está la parada del bus?»",
    tokens: ["is", "Where", "bus", "the", "stop"],
    solution: ["Where", "is", "the", "bus", "stop"],
    character: "beto",
    note: {
      title: "Where is…?",
      body: "Para preguntar por un lugar usas Where is + lugar. En plural sería «Where are the keys?».",
    },
  },
  {
    kind: "story",
    es: "Llegas a la parada: está muy cerca de tu casa.",
    en: "It's near my home.",
    speaker: "you",
    vocab: [["near", "cerca"]],
  },
  {
    kind: "type",
    prompt:
      "Don Beto no te entendió. Escribe en inglés: «¿Dónde está la parada del bus?»",
    accepted: ["where is the bus stop"],
    hint: "Where is the b__ s___",
    character: "beto",
    mood: "curious",
    note: {
      title: "El orden de la pregunta",
      body: "En inglés la pregunta empieza con la palabra interrogativa: Where + is + bus stop. No sigas el orden del español.",
    },
  },
  {
    kind: "story",
    es: "Don Beto añade que no está lejos y señala a la derecha.",
    en: "It's not far. The bus stop is on the right.",
    speaker: "beto",
    vocab: [
      ["right", "derecha"],
      ["far", "lejos"],
    ],
    character: "beto",
    mood: "happy",
  },
  {
    kind: "fill",
    prompt: "Completa lo que te dijo Don Beto.",
    sentence: "Go ___ and turn left.",
    answer: "straight",
    character: "beto",
  },
  {
    kind: "story",
    es: "Un loro se posa en la banca y repite el nombre de la parada. Ya sabes moverte por el barrio.",
    en: "Thanks! See you tomorrow.",
    speaker: "you",
    character: "coco",
    mood: "happy",
  },
]
