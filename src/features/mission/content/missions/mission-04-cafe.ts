import type { Beat } from "../../types/beat"

export const mission04Beats: Beat[] = [
  {
    kind: "story",
    es: "Antes de la entrevista entras a un café a desayunar. Cami te atiende desde el mostrador.",
    en: "Good morning! I want breakfast.",
    speaker: "you",
    vocab: [["breakfast", "desayuno"]],
    character: "cami",
    mood: "happy",
  },
  {
    kind: "choice",
    prompt: "Cami dice «Good morning!». ¿Qué significa?",
    options: ["Buenos días", "Buenas noches", "Adiós"],
    correct: 0,
    character: "cami",
  },
  {
    kind: "story",
    es: "Pides un café con la fórmula más educada.",
    en: "Can I have a coffee, please?",
    speaker: "you",
    vocab: [
      ["can I have", "¿me trae?"],
      ["coffee", "café"],
    ],
    character: "cami",
    mood: "happy",
  },
  {
    kind: "order",
    prompt: "Ordena la frase: «¿Me trae un té, por favor?»",
    tokens: ["have", "Can", "tea", "I", "please", "a"],
    solution: ["Can", "I", "have", "a", "tea", "please"],
    character: "cami",
    note: {
      title: "Can I have…?",
      body: "Es la forma educada de pedir en tiendas, cafés y restaurantes: «Can I have a tea, please?».",
    },
  },
  {
    kind: "story",
    es: "Cami te pregunta si quieres azúcar.",
    en: "Do you want sugar?",
    speaker: "cami",
    vocab: [
      ["sugar", "azúcar"],
      ["tea", "té"],
    ],
    character: "cami",
    mood: "curious",
  },
  {
    kind: "type",
    prompt: "Escribe en inglés: «¿Me trae un café, por favor?»",
    accepted: ["can i have a coffee please"],
    hint: "Can I have a c_____ p_____",
    character: "coco",
  },
  {
    kind: "story",
    es: "Cami te trae una taza grande y el desayuno.",
    en: "The cup is big!",
    speaker: "you",
    vocab: [
      ["cup", "taza"],
      ["bill", "cuenta"],
    ],
    character: "cami",
    mood: "happy",
  },
  {
    kind: "fill",
    prompt: "Pides la cuenta de forma educada.",
    sentence: "Can I have the ___, please?",
    answer: "bill",
    character: "cami",
    note: {
      title: "a / an / the",
      body: "«a» o «an» para algo cualquiera (a coffee); «the» para algo concreto (the bill).",
    },
  },
  {
    kind: "story",
    es: "Pagas, das las gracias y sales a la calle. Coco te despide desde la ventana. Tu primer café en inglés: hecho.",
    en: "Thanks! The breakfast was great.",
    speaker: "you",
    character: "coco",
    mood: "happy",
  },
]
