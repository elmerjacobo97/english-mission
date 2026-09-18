import type { Beat } from "../../types/beat"

export const mission03Beats: Beat[] = [
  {
    kind: "story",
    es: "Marta te dijo que hay trabajo al otro lado del barrio. Sales temprano a buscar la parada del bus.",
    en: "Where is the bus stop?",
    speaker: "you",
    vocab: [
      ["where", "dónde"],
      ["bus stop", "parada del bus"],
    ],
  },
  {
    kind: "choice",
    prompt: "Coco te mira desde la ventana. Ensayas la pregunta. ¿Con qué palabra empiezas?",
    options: ["Where", "Thanks", "Money"],
    correct: 0,
    character: "coco",
    mood: "curious",
  },
  {
    kind: "story",
    es: "En la esquina ves a un señor mayor. Te acercas a Don Beto.",
    en: "Hello! Where is the bus stop?",
    speaker: "you",
    character: "beto",
    mood: "curious",
  },
  {
    kind: "order",
    prompt: "Aún estás perdido. Ordena la pregunta: «¿Dónde está la parada del bus?»",
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
    es: "Don Beto señala la calle y te da la primera indicación.",
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
    kind: "fill",
    prompt: "Completa lo que te acaba de decir Don Beto.",
    sentence: "Go ___ and turn left.",
    answer: "straight",
    character: "beto",
  },
  {
    kind: "type",
    prompt:
      "El ruido de la calle tapó el final. Pregunta otra vez: «¿Dónde está la parada del bus?»",
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
    es: "Don Beto se acerca y aclara: no está lejos, a la derecha.",
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
    kind: "story",
    es: "Sigues las indicaciones y llegas a la parada: está muy cerca de tu casa.",
    en: "It's near my home.",
    speaker: "you",
    vocab: [["near", "cerca"]],
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
