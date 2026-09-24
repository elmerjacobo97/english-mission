import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, test } from "vitest"
import { emptyProgress, initProgress } from "@/shared/lib/progress/progress-store"
import type { ReviewCard } from "@/shared/lib/progress/types"
import { ProgressPanel } from "./progress-panel"

function card(box: ReviewCard["box"], dueAt: number): ReviewCard {
  return { box, dueAt, lastReviewedAt: dueAt }
}

beforeEach(() => {
  initProgress({ ...emptyProgress, courseBand: "basic" }, "")
})

describe("ProgressPanel", () => {
  test("shows an empty panel with the chosen route first", () => {
    render(<ProgressPanel />)

    expect(screen.getByRole("heading", { name: "Progreso" })).toBeInTheDocument()
    expect(screen.getByText("Racha actual").parentElement).toHaveTextContent("0")
    expect(screen.getByText("Récord").parentElement).toHaveTextContent("0 días")
    expect(screen.getByText("Protectores").parentElement).toHaveTextContent("0 de 2")
    expect(screen.getByText("Caja 1").parentElement).toHaveTextContent("0")
    expect(screen.getByText("Caja 2").parentElement).toHaveTextContent("0")
    expect(screen.getByText("Caja 3").parentElement).toHaveTextContent("0")
    expect(screen.getByText("Pendientes hoy").parentElement).toHaveTextContent("0")
    expect(screen.queryByRole("link", { name: "Repasar" })).not.toBeInTheDocument()

    const bands = screen.getAllByRole("heading", { level: 3 })
    expect(bands.map((heading) => heading.textContent)).toEqual([
      "Básico · Tu ruta",
      "Intermedio",
      "Avanzado",
    ])
    expect(screen.getByText("A1–A2 · 0 de 8")).toBeInTheDocument()
    expect(screen.getByText("B1–B2 · 0 de 1")).toBeInTheDocument()
    expect(screen.getByText("C1 · 0 de 3")).toBeInTheDocument()
  })

  test("counts words in all three boxes and those due today", () => {
    const now = Date.now()
    initProgress(
      {
        ...emptyProgress,
        courseBand: "basic",
        missions: {
          arrival: { completed: true, stars: 1, bestCoins: 0 },
        },
        reviews: {
          hello: card(1, now - 60_000),
          goodbye: card(1, now + 86_400_000),
          name: card(1, now - 60_000),
          please: card(2, now - 60_000),
          thanks: card(2, now + 86_400_000),
          yes: card(3, now - 60_000),
          no: card(3, now + 86_400_000),
          "nice to meet you": card(3, now - 60_000),
        },
      },
      "",
    )

    render(<ProgressPanel />)

    expect(screen.getByText("Caja 1").parentElement).toHaveTextContent("3")
    expect(screen.getByText("Caja 2").parentElement).toHaveTextContent("2")
    expect(screen.getByText("Caja 3").parentElement).toHaveTextContent("3")
    expect(screen.getByText("Pendientes hoy").parentElement).toHaveTextContent("5")
    expect(screen.getByRole("link", { name: "Repasar" })).toHaveAttribute("href", "/review")
  })

  test("lists completed missions for every band with the chosen one first", () => {
    initProgress(
      {
        ...emptyProgress,
        courseBand: "intermediate",
        streak: {
          ...emptyProgress.streak,
          current: 4,
          best: 9,
          freezes: 2,
        },
        missions: {
          arrival: { completed: true, stars: 2, bestCoins: 10 },
          interview: { completed: true, stars: 3, bestCoins: 20 },
        },
      },
      "",
    )

    render(<ProgressPanel />)

    expect(screen.getByText("Racha actual").parentElement).toHaveTextContent("4")
    expect(screen.getByText("Récord").parentElement).toHaveTextContent("9 días")
    expect(screen.getByText("Protectores").parentElement).toHaveTextContent("2 de 2")
    expect(
      screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent),
    ).toEqual(["Intermedio · Tu ruta", "Básico", "Avanzado"])
    expect(screen.getByText("B1–B2 · 1 de 1")).toBeInTheDocument()
    expect(screen.getByText("A1–A2 · 1 de 8")).toBeInTheDocument()
    expect(screen.getByText("C1 · 0 de 3")).toBeInTheDocument()
  })
})
