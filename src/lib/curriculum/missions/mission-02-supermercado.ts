import type { Beat } from "@/lib/game/types/beat"

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
    kind: "choice",
    prompt: "Miras la lista en la cocina. ¿Cuál de estas palabras significa 🍌?",
    options: ["apple", "banana", "bread"],
    correct: 1,
  },
  {
    kind: "story",
    es: "Sales a la calle. A dos cuadras hay un mercado pequeño. También quieres agua.",
    en: "I want water, please.",
    speaker: "you",
    vocab: [["water", "agua"]],
  },
  {
    kind: "story",
    es: "Entras al mercado. El vendedor se llama Nico y te saluda.",
    en: "Hello! Can I help you?",
    speaker: "nico",
    vocab: [["buy", "comprar"]],
    character: "nico",
    mood: "happy",
  },
  {
    kind: "order",
    prompt: "Nico espera tu pedido. Ordena la frase: «Quiero comprar bananas.»",
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
    character: "nico",
  },
  {
    kind: "story",
    es: "Vuelves a casa con la bolsa llena. Coco mira el refrigerador y pide más.",
    en: "I want milk!",
    speaker: "coco",
    character: "coco",
    mood: "happy",
  },
]
