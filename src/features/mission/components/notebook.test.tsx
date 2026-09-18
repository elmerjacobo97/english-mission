import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import {
  recordMissionResult,
  recordReviewResult,
} from "@/shared/lib/progress/progress-store"
import { Notebook } from "./notebook"

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
