import type { Beat } from "../../types/beat"

export const mission04Beats: Beat[] = [
  {
    kind: "story",
    es: "Antes de la entrevista entras a un café a desayunar.",
    en: "Good morning! I want breakfast.",
    vocab: [["breakfast", "desayuno"]],
  },
  {
    kind: "choice",
    prompt: "El camarero dice «Good morning!». ¿Qué significa?",
    options: ["Buenos días", "Buenas noches", "Adiós"],
    correct: 0,
  },
  {
    kind: "story",
    es: "Pides un café con la fórmula más educada.",
    en: "Can I have a coffee, please?",
    vocab: [
      ["can I have", "¿me trae?"],
      ["coffee", "café"],
    ],
  },
  {
    kind: "order",
    prompt: "Ordena la frase: «¿Me trae un té, por favor?»",
    tokens: ["have", "Can", "tea", "I", "please", "a"],
    solution: ["Can", "I", "have", "a", "tea", "please"],
  },
  {
    kind: "story",
    es: "El camarero pregunta si quieres azúcar.",
    en: "Do you want sugar?",
    vocab: [
      ["sugar", "azúcar"],
      ["tea", "té"],
    ],
  },
  {
    kind: "type",
    prompt: "Escribe en inglés: «¿Me trae un café, por favor?»",
    accepted: ["can i have a coffee please"],
    hint: "Can I have a c_____ p_____",
  },
  {
    kind: "story",
    es: "Te trae una taza grande y el desayuno.",
    en: "The cup is big!",
    vocab: [
      ["cup", "taza"],
      ["bill", "cuenta"],
    ],
  },
  {
    kind: "fill",
    prompt: "Pides la cuenta de forma educada.",
    sentence: "Can I have the ___, please?",
    answer: "bill",
  },
  {
    kind: "story",
    es: "Pagas, das las gracias y sales a la calle. Tu primer café en inglés: hecho.",
    en: "Thanks! The breakfast was great.",
  },
]
