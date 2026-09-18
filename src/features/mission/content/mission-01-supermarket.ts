import type { Mission } from "../types/mission"

export const supermarketMission: Mission = {
  slug: "supermercado",
  title: "El supermercado",
  subtitle: "Llegas a la ciudad y la nevera está vacía",
  emoji: "🍌",
  bonusCoins: 15,
  beats: [
    {
      kind: "story",
      es: "Llegas a la ciudad con una maleta y veinte dólares en el bolsillo.",
      en: "You arrive in the city with twenty dollars.",
      vocab: [
        ["city", "ciudad"],
        ["suitcase", "maleta"],
      ],
    },
    {
      kind: "story",
      es: "Tu habitación es pequeña. Abres la nevera: está vacía y tienes hambre.",
      en: "I am hungry.",
      vocab: [
        ["hungry", "hambriento"],
        ["empty", "vacía"],
      ],
    },
    {
      kind: "choice",
      prompt: "Antes de salir, repasemos. ¿Cuál de estas palabras significa 🍌?",
      options: ["apple", "banana", "bread"],
      correct: 1,
    },
    {
      kind: "story",
      es: "Sales a la calle. A dos cuadras hay un mercado pequeño.",
      en: "I'm going to the market.",
      vocab: [
        ["street", "calle"],
        ["market", "mercado"],
      ],
    },
    {
      kind: "order",
      prompt: "Ordena la frase: «Quiero comprar bananas.»",
      tokens: ["to", "I", "bananas", "want", "buy"],
      solution: ["I", "want", "to", "buy", "bananas"],
    },
    {
      kind: "story",
      es: "Entras al mercado. Un dependiente te saluda: «Hello! Can I help you?»",
      en: "Hello! Can I help you?",
      vocab: [["help", "ayudar"]],
    },
    {
      kind: "story",
      es: "Sonríes y respondes: «I'm looking for bananas.»",
      en: "I'm looking for bananas.",
      vocab: [["looking for", "buscar"]],
    },
    {
      kind: "type",
      prompt: "El dependiente te espera. Escribe en inglés: «Quiero dos bananas.»",
      accepted: ["i want two bananas", "i want 2 bananas"],
      hint: "I want two b______",
    },
    {
      kind: "story",
      es: "El dependiente te muestra un racimo. Preguntas el precio: «How much are they?»",
      en: "How much are they?",
      vocab: [
        ["how much", "cuánto"],
        ["price", "precio"],
      ],
    },
    {
      kind: "story",
      es: "Cuestan dos dólares. Pagas y guardas el cambio. «Here you go. Thank you!»",
      en: "Here you go. Thank you!",
      vocab: [
        ["money", "dinero"],
        ["thank you", "gracias"],
      ],
    },
    {
      kind: "story",
      es: "Sales del mercado con tus bananas. La nevera ya no está vacía: misión cumplida.",
      en: "Mission complete!",
    },
  ],
}
