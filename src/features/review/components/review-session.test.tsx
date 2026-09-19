import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { act } from "react"
import { hydrateRoot } from "react-dom/client"
import { renderToString } from "react-dom/server"
import { describe, expect, test } from "vitest"
import {
  getProgressSnapshot,
  recordMissionResult,
  recordReviewResult,
} from "@/shared/lib/progress/progress-store"
import { ReviewSession } from "./review-session"

const BLOCKED_WORDS = [
  "please",
  "thanks",
  "yes",
  "no",
  "name",
  "nice to meet you",
]

function seedTwoDueWords() {
  recordMissionResult("arrival", { stars: 1, payout: 30, bestCoins: 30 })
  for (const word of BLOCKED_WORDS) {
    recordReviewResult(word, true)
  }
}

describe("ReviewSession", () => {
  test("shows Todo al día without due words", () => {
    render(<ReviewSession />)

    expect(screen.getByText("Todo al día")).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Ir al cuaderno" }),
    ).toBeInTheDocument()
  })

  test("reviews two words, saves each answer and reaches the summary", async () => {
    const user = userEvent.setup()
    seedTwoDueWords()
    render(<ReviewSession />)

    expect(screen.getByText("1 de 2")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "hello" }))
    expect(getProgressSnapshot().reviews.hello).toMatchObject({ box: 2 })

    await user.click(screen.getByRole("button", { name: "Continuar" }))
    expect(screen.getByText("2 de 2")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "goodbye" }))
    expect(getProgressSnapshot().reviews.goodbye).toMatchObject({ box: 2 })

    await user.click(screen.getByRole("button", { name: "Ver resumen" }))

    expect(screen.getByText(/Repasamos 2 palabras/)).toBeInTheDocument()
    expect(screen.getByText("Repasadas")).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Volver al cuaderno" }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Repasar más" }),
    ).not.toBeInTheDocument()
  })

  test("does not touch the coin balance", async () => {
    const user = userEvent.setup()
    seedTwoDueWords()
    render(<ReviewSession />)

    const before = getProgressSnapshot().coins
    await user.click(screen.getByRole("button", { name: "Pista gratis" }))
    await user.click(screen.getByRole("button", { name: "hello" }))

    expect(getProgressSnapshot().coins).toBe(before)
    expect(before).toBe(30)
    expect(getProgressSnapshot().reviews.hello).toMatchObject({ box: 1 })
  })

  test("answering raises the streak once per day", async () => {
    const user = userEvent.setup()
    seedTwoDueWords()
    render(<ReviewSession />)

    await user.click(screen.getByRole("button", { name: "hello" }))
    await user.click(screen.getByRole("button", { name: "Continuar" }))
    await user.click(screen.getByRole("button", { name: "goodbye" }))

    expect(getProgressSnapshot().streak.current).toBe(1)
    expect(getProgressSnapshot().streak.best).toBe(1)
    expect(getProgressSnapshot().streak.lastDay).not.toBeNull()
  })

  test("hydrates without a mismatch when there are due words", async () => {
    const serverHtml = renderToString(<ReviewSession />)
    expect(serverHtml).toContain("Todo al día")

    recordMissionResult("arrival", { stars: 1, payout: 0, bestCoins: 0 })

    const recoverable: unknown[] = []
    const container = document.createElement("div")
    container.innerHTML = serverHtml

    await act(async () => {
      hydrateRoot(container, <ReviewSession />, {
        onRecoverableError: (error) => {
          recoverable.push(error)
        },
      })
    })

    expect(recoverable).toEqual([])
    expect(await within(container).findByText("1 de 8")).toBeTruthy()
  })

  test("caps the session at ten words and offers the rest", async () => {
    const user = userEvent.setup()
    recordMissionResult("arrival", { stars: 1, payout: 0, bestCoins: 0 })
    recordMissionResult("supermarket", { stars: 1, payout: 0, bestCoins: 0 })
    for (const word of ["banana", "apple", "bread", "milk"]) {
      recordReviewResult(word, true)
    }

    render(<ReviewSession />)

    expect(screen.getByText("1 de 10")).toBeInTheDocument()
    const firstSession = [
      "hello",
      "goodbye",
      "please",
      "thanks",
      "yes",
      "no",
      "name",
      "nice to meet you",
      "water",
      "want",
    ]
    for (const word of firstSession) {
      await user.click(screen.getByRole("button", { name: word }))
      await user.click(screen.getByRole("button", { name: /Continuar|Ver resumen/ }))
    }

    expect(screen.getByText(/Repasamos 10 palabras/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Repasar más" }))

    expect(screen.getByText("1 de 2")).toBeInTheDocument()
    for (const word of ["buy", "money"]) {
      await user.click(screen.getByRole("button", { name: word }))
      await user.click(screen.getByRole("button", { name: /Continuar|Ver resumen/ }))
    }

    expect(screen.getByText(/Repasamos 2 palabras/)).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Repasar más" }),
    ).not.toBeInTheDocument()
  })
})
