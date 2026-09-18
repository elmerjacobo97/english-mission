import type { Beat } from "../../types/beat"

export const mission01Beats: Beat[] = [
  {
    kind: "story",
    es: "Llegas a la ciudad en autobús. Es tu primer día: llevas una maleta y un papel con una dirección.",
    en: "Hello! I am new here.",
    vocab: [["hello", "hola"]],
  },
  {
    kind: "story",
    es: "En la parada, una mujer te sonríe y te saluda.",
    en: "Hello! Are you new here?",
  },
  {
    kind: "choice",
    prompt: "La mujer te dice «Hello!». ¿Qué te está diciendo?",
    options: ["Hola", "Adiós", "Gracias"],
    correct: 0,
  },
  {
    kind: "story",
    es: "Le dices tu nombre y ella se presenta: se llama Marta.",
    en: "Hello, my name is Alex. Nice to meet you.",
    vocab: [
      ["name", "nombre"],
      ["nice to meet you", "mucho gusto"],
    ],
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
  },
  {
    kind: "choice",
    prompt: "Quieres dar las gracias por la ayuda. ¿Qué dices?",
    options: ["Thanks", "No", "Goodbye"],
    correct: 0,
  },
  {
    kind: "story",
    es: "Marta te explica el camino y se despide con la mano.",
    en: "Goodbye! Good luck!",
    vocab: [["goodbye", "adiós"]],
  },
  {
    kind: "choice",
    prompt: "Conoces a alguien nuevo y quieres presentarte. ¿Qué dices?",
    options: ["My name is Alex", "No, thanks", "Goodbye"],
    correct: 0,
  },
  {
    kind: "story",
    es: "Ya tienes tu dirección y una amiga en la ciudad. El primer día está superado.",
    en: "Nice to meet you!",
  },
]
