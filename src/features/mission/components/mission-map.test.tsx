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
    "english-mission:progress:v5",
    JSON.stringify({
      version: 5,
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
    expect(screen.getByRole("link", { name: /Continuar/ })).toHaveAttribute(
      "href",
      "/mision/la-llegada",
    )
    expect(
      screen.queryByRole("link", { name: /Cuaderno/ }),
    ).not.toBeInTheDocument()
  })

  test("reflects stars, stamps and unlocks from the store", () => {
    addCoins(40)
    recordMissionResult("la-llegada", { stars: 2, payout: 0, bestCoins: 40 })

    render(<MissionMap />)

    expect(screen.getByText("40")).toBeInTheDocument()
    expect(screen.getByText("COMPLETADA")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Repetir/ })).toBeInTheDocument()
    expect(
      screen.getByRole("img", { name: "2 de 3 estrellas" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Continuar/ })).toHaveAttribute(
      "href",
      "/mision/la-llegada",
    )
    expect(
      screen.getByRole("link", { name: /Cuaderno de vocabulario/ }),
    ).toBeInTheDocument()
    expect(
      screen.getAllByText("Completa la misión anterior para desbloquearla"),
    ).toHaveLength(2)
  })

  test("points to the next mission once the first one is mastered", () => {
    recordMissionResult("la-llegada", { stars: 3, payout: 0, bestCoins: 45 })

    render(<MissionMap />)

    expect(screen.getByRole("link", { name: /Continuar/ })).toHaveAttribute(
      "href",
      "/mision/supermercado",
    )
    expect(
      screen.getByRole("img", { name: "3 de 3 estrellas" }),
    ).toBeInTheDocument()
  })

  test("offers the review card when words are due", () => {
    recordMissionResult("la-llegada", { stars: 1, payout: 0, bestCoins: 0 })

    render(<MissionMap />)

    expect(
      screen.getByRole("link", { name: /Repasar vocabulario/ }),
    ).toHaveAttribute("href", "/review")
  })

  test("hides the review card without due words", () => {
    render(<MissionMap />)

    expect(
      screen.queryByRole("link", { name: /Repasar/ }),
    ).not.toBeInTheDocument()
  })

  test("shows the coin shop card without progress", () => {
    render(<MissionMap />)

    expect(
      screen.getByRole("link", { name: /Tienda de monedas/ }),
    ).toHaveAttribute("href", "/shop")
  })

  test("keeps the coin shop card visible with progress", () => {
    addCoins(40)
    recordMissionResult("la-llegada", { stars: 2, payout: 0, bestCoins: 40 })

    render(<MissionMap />)

    expect(
      screen.getByRole("link", { name: /Tienda de monedas/ }),
    ).toHaveAttribute("href", "/shop")
  })

  test("shows the streak chip with Empieza hoy at zero", () => {
    render(<MissionMap />)

    expect(screen.getByText("Empieza hoy")).toBeInTheDocument()
    expect(screen.getByLabelText(/Récord: 0 días/)).toBeInTheDocument()
  })

  test("shows the current streak with the record in the accessible text", () => {
    seedStreak({ current: 5, best: 9, lastDay: "2026-09-10" })

    render(<MissionMap />)

    expect(screen.getByText("5")).toBeInTheDocument()
    expect(screen.getByLabelText(/Récord: 9 días/)).toBeInTheDocument()
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
      window.localStorage.getItem("english-mission:progress:v5") ?? "{}",
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

  test("reset asks for confirmation and clears stored progress", async () => {
    const user = userEvent.setup()
    addCoins(20)
    render(<MissionMap />)

    await user.click(
      screen.getByRole("button", { name: /Reiniciar progreso/ }),
    )
    expect(
      screen.getByText(/Esto borra tus monedas, estrellas y misiones/),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Sí, borrar todo" }))

    expect(screen.queryByText(/¿Seguro\?/)).not.toBeInTheDocument()
    expect(
      window.localStorage.getItem("english-mission:progress:v5"),
    ).toBeNull()
  })

  test("cancel keeps progress", async () => {
    const user = userEvent.setup()
    addCoins(20)
    render(<MissionMap />)

    await user.click(
      screen.getByRole("button", { name: /Reiniciar progreso/ }),
    )
    await user.click(screen.getByRole("button", { name: "Cancelar" }))

    expect(
      window.localStorage.getItem("english-mission:progress:v5"),
    ).not.toBeNull()
    expect(screen.getByText("20")).toBeInTheDocument()
  })
})
