import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, test, vi } from "vitest"
import { speak } from "@/shared/lib/speech"
import {
  getProgressSnapshot,
  recordMissionResult,
  recordReviewResult,
} from "@/shared/lib/progress/progress-store"
import { submitChallengeForm } from "@/test/submit-challenge"
import { Notebook } from "./notebook"

vi.mock("@/shared/lib/speech", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/lib/speech")>()
  return { ...actual, speak: vi.fn() }
})

function withSpeech(): void {
  vi.stubGlobal("speechSynthesis", {
    cancel: vi.fn(),
    getVoices: () => [],
    speak: vi.fn(),
  })
}

function seedBoxThree(key: string): void {
  recordReviewResult(key, true)
  recordReviewResult(key, true)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

const MISSION_1_WORDS = [
  "hello",
  "goodbye",
  "please",
  "thanks",
  "yes",
  "no",
  "name",
  "nice to meet you",
]

describe("Notebook", () => {
  test("invites the first mission when there is nothing to review", () => {
    render(<Notebook />)
    expect(screen.getByText("Todavía no hay palabras aquí")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ir al mapa" })).toBeInTheDocument()
    expect(
      screen.queryByRole("link", { name: /Repasar/ }),
    ).not.toBeInTheDocument()
  })

  test("lists the vocabulary of completed missions by chapter", () => {
    recordMissionResult("la-llegada", { stars: 3, payout: 0, bestCoins: 45 })

    render(<Notebook />)

    expect(screen.getByText(/Capítulo 1 · Primeros pasos/)).toBeInTheDocument()
    expect(screen.getByText("hello")).toBeInTheDocument()
    expect(screen.getByText("hola · La llegada")).toBeInTheDocument()
    expect(screen.getByText("nice to meet you")).toBeInTheDocument()
    expect(screen.queryByText("banana")).not.toBeInTheDocument()
    expect(
      screen.queryByText(/Capítulo 2 · La ciudad/),
    ).not.toBeInTheDocument()
  })

  test("adds vocabulary from later missions as they are completed", () => {
    recordMissionResult("la-llegada", { stars: 1, payout: 0, bestCoins: 0 })
    recordMissionResult("supermercado", { stars: 1, payout: 0, bestCoins: 0 })

    render(<Notebook />)

    expect(screen.getByText("banana")).toBeInTheDocument()
    expect(screen.getByText("plátano · El supermercado")).toBeInTheDocument()
  })

  test("offers review with the due count after completing a mission", () => {
    recordMissionResult("la-llegada", { stars: 3, payout: 0, bestCoins: 45 })

    render(<Notebook />)

    expect(screen.getByRole("link", { name: /Repasar/ })).toHaveAttribute(
      "href",
      "/review",
    )
    expect(screen.getByText("8")).toBeInTheDocument()
  })

  test("hides review once every word is scheduled for later", () => {
    recordMissionResult("la-llegada", { stars: 1, payout: 0, bestCoins: 0 })
    for (const word of MISSION_1_WORDS) {
      recordReviewResult(word, true)
    }

    render(<Notebook />)

    expect(
      screen.queryByRole("link", { name: /Repasar/ }),
    ).not.toBeInTheDocument()
  })
})

describe("Notebook practice", () => {
  test("paints one mastery dot without a card and three with box 3", () => {
    recordMissionResult("la-llegada", { stars: 1, payout: 0, bestCoins: 0 })
    seedBoxThree("hello")

    render(<Notebook />)

    const boxThree = screen.getByLabelText("Dominio: caja 3 de 3")
    const boxOne = screen.getAllByLabelText("Dominio: caja 1 de 3")[0]

    expect(boxThree.querySelectorAll('[data-filled="true"]')).toHaveLength(3)
    expect(boxOne.querySelectorAll('[data-filled="true"]')).toHaveLength(1)
  })

  test("opens the chosen word challenge and hides the list", async () => {
    const user = userEvent.setup()
    recordMissionResult("la-llegada", { stars: 1, payout: 0, bestCoins: 0 })
    render(<Notebook />)

    await user.click(screen.getByRole("button", { name: "Practicar hello" }))

    expect(screen.getByText("Práctica · hello")).toBeInTheDocument()
    expect(
      screen.getByText("¿Cómo se dice «hola» en inglés?"),
    ).toBeInTheDocument()
    expect(screen.queryByText("hola · La llegada")).not.toBeInTheDocument()
  })

  test("solving shows Continuar and returns to the list without mutations", async () => {
    const user = userEvent.setup()
    recordMissionResult("la-llegada", { stars: 1, payout: 0, bestCoins: 0 })
    render(<Notebook />)

    const before = getProgressSnapshot()
    await user.click(screen.getByRole("button", { name: "Practicar hello" }))
    await user.click(screen.getByRole("button", { name: "hello" }))

    expect(getProgressSnapshot().reviews).toEqual({})
    expect(getProgressSnapshot().coins).toBe(before.coins)
    expect(getProgressSnapshot().streak).toEqual(before.streak)

    await user.click(screen.getByRole("button", { name: "Continuar" }))

    expect(screen.getByText("hola · La llegada")).toBeInTheDocument()
    expect(screen.queryByText("Práctica · hello")).not.toBeInTheDocument()
  })

  test("revealing does not touch reviews, coins or streak", async () => {
    const user = userEvent.setup()
    recordMissionResult("la-llegada", { stars: 1, payout: 0, bestCoins: 0 })
    render(<Notebook />)

    const before = getProgressSnapshot()
    await user.click(screen.getByRole("button", { name: "Practicar hello" }))
    await user.click(screen.getByRole("button", { name: "goodbye" }))
    await user.click(screen.getByRole("button", { name: "please" }))
    await user.click(screen.getByRole("button", { name: "goodbye" }))

    expect(getProgressSnapshot().reviews).toEqual({})
    expect(getProgressSnapshot().coins).toBe(before.coins)
    expect(getProgressSnapshot().streak).toEqual(before.streak)
    expect(screen.getByRole("button", { name: "Continuar" })).toBeInTheDocument()
  })

  test("solving an existing card keeps it untouched", async () => {
    const user = userEvent.setup()
    recordMissionResult("la-llegada", { stars: 1, payout: 0, bestCoins: 0 })
    seedBoxThree("hello")
    render(<Notebook />)

    const before = getProgressSnapshot()
    const card = before.reviews["hello"]

    await user.click(screen.getByRole("button", { name: "Practicar hello" }))
    await user.type(
      screen.getByRole("textbox", { name: "Tu respuesta en inglés" }),
      "hello",
    )
    submitChallengeForm()

    expect(screen.getByRole("button", { name: "Continuar" })).toBeInTheDocument()
    expect(getProgressSnapshot().reviews["hello"]).toEqual(card)
    expect(getProgressSnapshot().coins).toBe(before.coins)
    expect(getProgressSnapshot().streak).toEqual(before.streak)
  })

  test("box 3 with speech plays the word from the Escuchar button", async () => {
    const user = userEvent.setup()
    withSpeech()
    recordMissionResult("la-llegada", { stars: 1, payout: 0, bestCoins: 0 })
    seedBoxThree("hello")
    render(<Notebook />)

    const speakMock = vi.mocked(speak)
    speakMock.mockClear()
    await user.click(screen.getByRole("button", { name: "Practicar hello" }))
    await user.click(screen.getByRole("button", { name: "Escuchar" }))

    expect(speakMock).toHaveBeenCalledWith("hello")
  })

  test("box 3 without speech falls back to typing", async () => {
    const user = userEvent.setup()
    recordMissionResult("la-llegada", { stars: 1, payout: 0, bestCoins: 0 })
    seedBoxThree("hello")
    render(<Notebook />)

    await user.click(screen.getByRole("button", { name: "Practicar hello" }))

    expect(
      screen.queryByRole("button", { name: "Escuchar" }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("textbox", { name: "Tu respuesta en inglés" }),
    ).toBeInTheDocument()
  })

  test("uses the profile of the word level", async () => {
    const user = userEvent.setup()
    recordMissionResult("primer-dia", { stars: 1, payout: 0, bestCoins: 0 })
    render(<Notebook />)

    await user.click(screen.getByRole("button", { name: "Practicar computer" }))

    expect(
      screen.getByLabelText("Intentos fallidos: 0 de 2"),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "break" }))

    expect(screen.getByText("Te queda 1 intento.")).toBeInTheDocument()
  })
})
