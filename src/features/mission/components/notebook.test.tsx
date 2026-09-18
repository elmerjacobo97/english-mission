import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { recordMissionResult } from "@/lib/progress/progress-store"
import { Notebook } from "./notebook"

describe("Notebook", () => {
  test("invites the first mission when there is nothing to review", () => {
    render(<Notebook />)
    expect(screen.getByText("Todavía no hay palabras aquí")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ir al mapa" })).toBeInTheDocument()
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
})
