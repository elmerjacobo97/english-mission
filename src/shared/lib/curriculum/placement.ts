import type { CefrLevel, CourseBand } from "@/shared/lib/game/types/mission"

export type PlacementQuestion = {
  id: string
  band: CourseBand
  cefrLevel: CefrLevel
  prompt: string
  audioText?: string
  options: string[]
  correct: number
  explanation: string
}

export const PLACEMENT_QUESTIONS: PlacementQuestion[] = [
  {
    id: "basic-greeting",
    band: "basic",
    cefrLevel: "A1",
    prompt: "Alguien te dice “Nice to meet you”. ¿Qué respondes?",
    options: ["Nice to meet you too.", "I live on Tuesday.", "No, I don't."],
    correct: 0,
    explanation: "“Nice to meet you too” es una respuesta natural a un saludo.",
  },
  {
    id: "basic-listening",
    band: "basic",
    cefrLevel: "A1",
    prompt: "Escucha y elige lo que la persona está pidiendo.",
    audioText: "Could I have a glass of water, please?",
    options: ["Un vaso de agua, por favor.", "Una dirección para llegar al trabajo.", "La cuenta de la cena."],
    correct: 0,
    explanation: "“Could I have…?” sirve para pedir algo con amabilidad.",
  },
  {
    id: "basic-explanation",
    band: "basic",
    cefrLevel: "A2",
    prompt: "Perdiste el bus y llegarás tarde. ¿Qué frase lo explica mejor?",
    options: [
      "I missed the bus, so I'll arrive a little late.",
      "I catch the bus every morning.",
      "Could you show me the menu?",
    ],
    correct: 0,
    explanation: "La frase conecta lo que pasó con la consecuencia: llegar tarde.",
  },
  {
    id: "intermediate-experience",
    band: "intermediate",
    cefrLevel: "B1",
    prompt: "Completa: “I ___ at this company for three years.”",
    options: ["have worked", "work yesterday", "am work"],
    correct: 0,
    explanation: "El presente perfecto conecta una experiencia pasada con el presente.",
  },
  {
    id: "intermediate-listening",
    band: "intermediate",
    cefrLevel: "B1",
    prompt: "Escucha el cambio de horario y elige la información correcta.",
    audioText: "The meeting has been moved to Thursday because the client is unavailable.",
    options: [
      "La reunión será el jueves porque el cliente no puede asistir antes.",
      "El cliente canceló el proyecto y la reunión ya no se hará.",
      "La reunión seguirá el martes y el cliente llegará tarde.",
    ],
    correct: 0,
    explanation: "“Has been moved to Thursday” indica que se cambió al jueves.",
  },
  {
    id: "intermediate-conditional",
    band: "intermediate",
    cefrLevel: "B2",
    prompt: "Completa: “Had I known about the change, I ___ the earlier train.”",
    options: ["would have taken", "will take", "would take yesterday"],
    correct: 0,
    explanation: "La inversión “Had I known” expresa una condición pasada no real.",
  },
  {
    id: "advanced-concession",
    band: "advanced",
    cefrLevel: "C1",
    prompt: "Elige la opción que conserva el sentido: “Despite receiving mixed feedback, she refined the proposal.”",
    options: [
      "Although the feedback was mixed, she improved the proposal.",
      "Because everyone approved it, she withdrew the proposal.",
      "She refined the proposal before anyone gave feedback.",
    ],
    correct: 0,
    explanation: "“Despite” introduce una dificultad que no impidió la acción.",
  },
  {
    id: "advanced-register",
    band: "advanced",
    cefrLevel: "C1",
    prompt: "¿Qué significa “albeit” en esta frase? “The solution is effective, albeit expensive.”",
    options: ["aunque", "por lo tanto", "tan pronto como"],
    correct: 0,
    explanation: "“Albeit” introduce un contraste: es eficaz, aunque costosa.",
  },
  {
    id: "advanced-listening",
    band: "advanced",
    cefrLevel: "C1",
    prompt: "Escucha y resume la decisión del comité.",
    audioText: "Notwithstanding the initial reservations, the committee endorsed the revised proposal.",
    options: [
      "Pese a sus dudas iniciales, el comité aprobó la propuesta revisada.",
      "El comité rechazó la propuesta sin revisarla.",
      "La propuesta se aprobó antes de que el comité la recibiera.",
    ],
    correct: 0,
    explanation: "“Notwithstanding” equivale a “a pesar de”; “endorsed” es apoyar o aprobar.",
  },
]

export type PlacementResult = {
  correctByBand: Record<CourseBand, number>
  recommended: CourseBand
}

export function scorePlacement(answers: Record<string, number>): PlacementResult {
  const correctByBand: Record<CourseBand, number> = {
    basic: 0,
    intermediate: 0,
    advanced: 0,
  }

  for (const question of PLACEMENT_QUESTIONS) {
    if (answers[question.id] === question.correct) {
      correctByBand[question.band] += 1
    }
  }

  const passed = (band: CourseBand) => correctByBand[band] >= 2
  let recommended: CourseBand = "basic"
  if (passed("basic") && passed("intermediate")) {
    recommended = "intermediate"
  }
  if (passed("basic") && passed("intermediate") && passed("advanced")) {
    recommended = "advanced"
  }

  return { correctByBand, recommended }
}
