import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test } from "vitest"
import {
  addCoins,
  getProgressSnapshot,
  recordMissionResult,
  reloadProgress,
} from "@/lib/progress/progress-store"
import type { StreakState } from "@/lib/progress/types"
import { MissionMap } from "./mission-map"

function seedStreak(streak: Partial<StreakState>) {
  window.localStorage.setItem(
    "english-mission:progress:v6",
    JSON.stringify({
      version: 6,
      coins: 0,
      missions: {},
      reviews: {},
      streak: {
        current: 0,
        best: 0,
        lastDay: null,
        pendingMilestone: null,
        ...streak,
      },
      shop: { day: null, count: 0 },
      looks: { owned: [], equipped: "classic" },
    }),
  )
  reloadProgress()
}

describe("MissionMap", () => {
  test("groups missions by chapter and points to the next one", () => {
    render(<MissionMap />)

    expect(
      screen.getByText(/Capítulo 1 · Primeros pasos/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Capítulo 2 · La ciudad/)).toBeInTheDocument()
    expect(screen.getByText(/Capítulo 3 · La vida/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Jugar/ })).toBeInTheDocument()
    expect(
      screen.getAllByText("Completa la misión anterior para desbloquearla"),
    ).toHaveLength(3)
    expect(screen.getAllByText("Próximamente")).toHaveLength(8)
    const nextCard = screen.getByRole("link", { name: /La llegada/ })
    expect(nextCard).toHaveAttribute("href", "/mision/la-llegada")
    expect(nextCard).toHaveTextContent("Siguiente")
  })

  test("reflects stars, stamps and unlocks from the store", () => {
    addCoins(40)
    recordMissionResult("la-llegada", { stars: 2, payout: 0, bestCoins: 40 })

    render(<MissionMap />)

    expect(screen.getByText("COMPLETADA")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Repetir/ })).toBeInTheDocument()
    expect(
      screen.getByRole("img", { name: "2 de 3 estrellas" }),
    ).toBeInTheDocument()
    const nextCard = screen.getByRole("link", { name: /La llegada/ })
    expect(nextCard).toHaveAttribute("href", "/mision/la-llegada")
    expect(nextCard).not.toHaveTextContent("Siguiente")
    expect(
      screen.getAllByText("Completa la misión anterior para desbloquearla"),
    ).toHaveLength(2)
  })

  test("points to the next mission once the first one is mastered", () => {
    recordMissionResult("la-llegada", { stars: 3, payout: 0, bestCoins: 45 })

    render(<MissionMap />)

    const nextCard = screen.getByRole("link", { name: /supermercado/ })
    expect(nextCard).toHaveAttribute("href", "/mision/supermercado")
    expect(nextCard).toHaveTextContent("Siguiente")
    expect(
      screen.getByRole("img", { name: "3 de 3 estrellas" }),
    ).toBeInTheDocument()
  })

  test("shows the milestone notice, closes it and does not bring it back", async () => {
    const user = userEvent.setup()
    seedStreak({
      current: 7,
      best: 7,
      lastDay: "2026-09-10",
      pendingMilestone: 7,
    })
    const { unmount } = render(<MissionMap />)

    expect(
      screen.getByText(/¡Racha de 7 días! \+25 monedas/),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Cerrar aviso" }))

    expect(screen.queryByText(/¡Racha de 7 días!/)).not.toBeInTheDocument()
    expect(getProgressSnapshot().streak.pendingMilestone).toBeNull()
    const stored = JSON.parse(
      window.localStorage.getItem("english-mission:progress:v6") ?? "{}",
    ) as { streak?: { pendingMilestone?: unknown } }
    expect(stored.streak?.pendingMilestone).toBeNull()

    unmount()
    render(<MissionMap />)
    expect(screen.queryByText(/¡Racha de 7 días!/)).not.toBeInTheDocument()
  })

  test("does not show the notice without a pending milestone", () => {
    render(<MissionMap />)

    expect(screen.queryByText(/¡Racha de/)).not.toBeInTheDocument()
  })

  test("hides the reset button without progress", () => {
    render(<MissionMap />)

    expect(
      screen.queryByRole("button", { name: /Reiniciar progreso/ }),
    ).not.toBeInTheDocument()
  })

  test("reset asks for confirmation in a dialog and clears stored progress", async () => {
    const user = userEvent.setup()
    addCoins(20)
    render(<MissionMap />)

    await user.click(
      screen.getByRole("button", { name: /Reiniciar progreso/ }),
    )
    expect(
      screen.getByRole("alertdialog", { name: "¿Reiniciar progreso?" }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Esto borra tus monedas, estrellas y misiones/),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Sí, borrar todo" }))

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    expect(
      window.localStorage.getItem("english-mission:progress:v6"),
    ).toBeNull()
  })

  test("cancel keeps progress and closes the dialog", async () => {
    const user = userEvent.setup()
    addCoins(20)
    render(<MissionMap />)

    await user.click(
      screen.getByRole("button", { name: /Reiniciar progreso/ }),
    )
    await user.click(screen.getByRole("button", { name: "Cancelar" }))

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    expect(
      window.localStorage.getItem("english-mission:progress:v6"),
    ).not.toBeNull()
    expect(getProgressSnapshot().coins).toBe(20)
  })

  test("closes the reset dialog with Escape", async () => {
    const user = userEvent.setup()
    addCoins(20)
    render(<MissionMap />)

    await user.click(
      screen.getByRole("button", { name: /Reiniciar progreso/ }),
    )
    await user.keyboard("{Escape}")

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    expect(getProgressSnapshot().coins).toBe(20)
  })
})
