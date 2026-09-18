import type { Beat } from "../../types/beat"

export const mission02Beats: Beat[] = [
  {
    kind: "story",
    es: "Tu habitación es pequeña y la nevera está vacía. Tienes hambre.",
    en: "I want bread and milk.",
    vocab: [
      ["bread", "pan"],
      ["milk", "leche"],
      ["want", "querer"],
    ],
  },
  {
    kind: "story",
    es: "Sales a la calle. A dos cuadras hay un mercado pequeño.",
    en: "I'm going to the market.",
    vocab: [["water", "agua"]],
  },
  {
    kind: "choice",
    prompt: "Antes de salir, repasemos. ¿Cuál de estas palabras significa 🍌?",
    options: ["apple", "banana", "bread"],
    correct: 1,
  },
  {
    kind: "story",
    es: "Entras al mercado y el dependiente te saluda.",
    en: "Hello! Can I help you?",
    vocab: [["buy", "comprar"]],
  },
  {
    kind: "order",
    prompt: "Ordena la frase: «Quiero comprar bananas.»",
    tokens: ["to", "I", "bananas", "want", "buy"],
    solution: ["I", "want", "to", "buy", "bananas"],
  },
  {
    kind: "story",
    es: "Señalas lo que quieres y pides por favor.",
    en: "Bananas, apples, bread and water, please.",
    vocab: [
      ["banana", "plátano"],
      ["apple", "manzana"],
    ],
  },
  {
    kind: "order",
    prompt: "El dependiente te dice el precio. Ordena la pregunta: «¿Cuánto cuestan?»",
    tokens: ["much", "are", "How", "they"],
    solution: ["How", "much", "are", "they"],
  },
  {
    kind: "story",
    es: "Pagas con un billete y guardas el cambio.",
    en: "Here is the money. Thanks!",
    vocab: [["money", "dinero"]],
  },
  {
    kind: "story",
    es: "Sales del mercado con la bolsa llena. La nevera ya no está vacía.",
    en: "Mission complete!",
  },
]
