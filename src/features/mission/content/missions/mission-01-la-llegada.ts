import type { Beat } from "../../types/beat"

export const mission01Beats: Beat[] = [
  {
    kind: "story",
    es: "Llegas a la ciudad en autobús. Es tu primer día: llevas una maleta y un papel con una dirección.",
    en: "Hello! I am new here.",
    vocab: [["hello", "hola"]],
    note: {
      title: "Saludos",
      body: "«Hello» funciona a cualquier hora del día. Para despedirte usas «goodbye». Con «please» pides con educación y con «thanks» agradeces.",
    },
  },
  {
    kind: "story",
    es: "En la parada, una mujer te sonríe y te saluda.",
    en: "Hello! Are you new here?",
    character: "marta",
    mood: "happy",
  },
  {
    kind: "choice",
    prompt: "Marta te dice «Hello!». ¿Qué te está diciendo?",
    options: ["Hola", "Adiós", "Gracias"],
    correct: 0,
    character: "marta",
    mood: "curious",
  },
  {
    kind: "story",
    es: "Le dices tu nombre y ella se presenta: se llama Marta.",
    en: "Hello, my name is Alex. Nice to meet you.",
    vocab: [
      ["name", "nombre"],
      ["nice to meet you", "mucho gusto"],
    ],
    character: "marta",
    mood: "happy",
    note: {
      title: "Nice to meet you",
      body: "Frase fija para la primera vez que conoces a alguien. Se responde «Nice to meet you too».",
    },
  },
  {
    kind: "story",
    es: "Marta te pregunta si necesitas ayuda. Tú asientes y das las gracias.",
    en: "Yes, please. Thanks!",
    vocab: [
      ["yes", "sí"],
      ["please", "por favor"],
      ["thanks", "gracias"],
    ],
    character: "marta",
    mood: "happy",
  },
  {
    kind: "choice",
    prompt: "Quieres dar las gracias por la ayuda. ¿Qué dices?",
    options: ["Thanks", "No", "Goodbye"],
    correct: 0,
    character: "marta",
  },
  {
    kind: "story",
    es: "Marta te explica el camino y se despide con la mano.",
    en: "Goodbye! Good luck!",
    vocab: [["goodbye", "adiós"]],
    character: "marta",
    mood: "happy",
  },
  {
    kind: "choice",
    prompt: "Conoces a alguien nuevo y quieres presentarte. ¿Qué dices?",
    options: ["My name is Alex", "No, thanks", "Goodbye"],
    correct: 0,
    character: "marta",
    mood: "curious",
  },
  {
    kind: "story",
    es: "Un loro del edificio repite lo que acabas de decir. Ya tienes dirección, una amiga y un loro charlatán.",
    en: "Nice to meet you!",
    character: "coco",
    mood: "happy",
  },
]
