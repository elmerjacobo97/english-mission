import type { Beat } from "../../types/beat"

export const mission02Beats: Beat[] = [
  {
    kind: "story",
    es: "Tu habitación es pequeña y el refrigerador está vacío. Tienes hambre.",
    en: "I want bread and milk.",
    speaker: "you",
    vocab: [
      ["bread", "pan"],
      ["milk", "leche"],
      ["want", "querer"],
    ],
    note: {
      title: "I want + cosa",
      body: "«I want bread» significa quiero pan. Si después va otro verbo, ese verbo lleva «to»: «I want to buy».",
    },
  },
  {
    kind: "story",
    es: "Sales a la calle. A dos cuadras hay un mercado pequeño.",
    en: "I'm going to the market.",
    speaker: "you",
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
    es: "Entras al mercado y el vendedor te saluda.",
    en: "Hello! Can I help you?",
    speaker: "nico",
    vocab: [["buy", "comprar"]],
    character: "nico",
    mood: "happy",
  },
  {
    kind: "order",
    prompt: "Ordena la frase: «Quiero comprar bananas.»",
    tokens: ["to", "I", "bananas", "want", "buy"],
    solution: ["I", "want", "to", "buy", "bananas"],
    character: "nico",
    note: {
      title: "El «to» une dos verbos",
      body: "Cuando hay dos verbos seguidos, el segundo lleva «to»: I want TO buy, I need TO go. Ese «to» no se traduce.",
    },
  },
  {
    kind: "story",
    es: "Señalas lo que quieres y pides por favor.",
    en: "Bananas, apples, bread and water, please.",
    speaker: "you",
    vocab: [
      ["banana", "plátano"],
      ["apple", "manzana"],
    ],
    character: "nico",
    mood: "happy",
  },
  {
    kind: "order",
    prompt: "Nico te dice el precio. Ordena la pregunta: «¿Cuánto cuestan?»",
    tokens: ["much", "are", "How", "they"],
    solution: ["How", "much", "are", "they"],
    character: "nico",
    mood: "curious",
    note: {
      title: "How much…?",
      body: "Para precios: «How much is it?» con una cosa y «How much are they?» con varias.",
    },
  },
  {
    kind: "story",
    es: "Pagas con un billete y guardas el cambio.",
    en: "Here is the money. Thanks!",
    speaker: "you",
    vocab: [["money", "dinero"]],
  },
  {
    kind: "story",
    es: "Sales del mercado con la bolsa llena. El refrigerador ya no está vacío.",
    en: "Mission complete!",
    speaker: "coco",
    character: "coco",
    mood: "happy",
  },
]
