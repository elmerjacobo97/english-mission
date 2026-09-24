import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, test } from "vitest"
import {
  addCoins,
  emptyProgress,
  getProgressSnapshot,
  initProgress,
  recordMissionResult,
  registerDailyActivity,
} from "@/shared/lib/progress/progress-store"
import type { StreakState } from "@/shared/lib/progress/types"
import { MissionMap } from "./mission-map"

beforeEach(() => {
  initProgress({ ...emptyProgress, courseBand: "basic" }, "")
})

function seedStreak(streak: Partial<StreakState>) {
  initProgress(
    {
      ...emptyProgress,
      streak: { ...emptyProgress.streak, ...streak },
    },
    "",
  )
}

describe("MissionMap", () => {
  test("shows only the chosen CEFR route and points to its next mission", () => {
    render(<MissionMap />)

    expect(screen.getByText(/Ruta Básico · A1–A2/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Jugar/ })).toBeInTheDocument()
    expect(
      screen.getAllByText("Completa la misión anterior para desbloquearla"),
    ).toHaveLength(7)
    expect(screen.queryByText("Próximamente")).not.toBeInTheDocument()
    const nextCard = screen.getByRole("link", { name: /La llegada/ })
    expect(nextCard).toHaveAttribute("href", "/mission/arrival")
    expect(nextCard).toHaveTextContent("Siguiente")
  })

  test("reflects stars, stamps and unlocks from the store", () => {
    addCoins(40)
    recordMissionResult("arrival", { stars: 2, payout: 0, bestCoins: 40 })

    render(<MissionMap />)

    expect(screen.getByText("COMPLETADA")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Repetir/ })).toBeInTheDocument()
    expect(
      screen.getByRole("img", { name: "2 de 3 estrellas" }),
    ).toBeInTheDocument()
    const nextCard = screen.getByRole("link", { name: /La llegada/ })
    expect(nextCard).toHaveAttribute("href", "/mission/arrival")
    expect(nextCard).not.toHaveTextContent("Siguiente")
    expect(
      screen.getAllByText("Completa la misión anterior para desbloquearla"),
    ).toHaveLength(6)
  })

  test("points to the next mission once the first one is mastered", () => {
    recordMissionResult("arrival", { stars: 3, payout: 0, bestCoins: 45 })

    render(<MissionMap />)

    const nextCard = screen.getByRole("link", { name: /supermercado/ })
    expect(nextCard).toHaveAttribute("href", "/mission/supermarket")
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

    unmount()
    render(<MissionMap />)
    expect(screen.queryByText(/¡Racha de 7 días!/)).not.toBeInTheDocument()
  })

  test("does not show the notice without a pending milestone", () => {
    render(<MissionMap />)

    expect(screen.queryByText(/¡Racha de/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Usamos/)).not.toBeInTheDocument()
  })

  test("shows the freeze notice after a covered day and hides it once closed", async () => {
    const user = userEvent.setup()
    initProgress(
      {
        ...emptyProgress,
        courseBand: "basic",
        streak: {
          ...emptyProgress.streak,
          current: 4,
          best: 4,
          lastDay: "2026-09-07",
          freezes: 1,
        },
      },
      "",
    )
    registerDailyActivity(new Date(2026, 8, 9, 12).getTime())

    const { unmount } = render(<MissionMap />)

    expect(
      screen.getByText("Usamos un protector. Tu racha sigue."),
    ).toBeInTheDocument()
    expect(getProgressSnapshot().streak.current).toBe(5)
    expect(getProgressSnapshot().streak.freezes).toBe(0)

    await user.click(
      screen.getByRole("button", { name: "Cerrar aviso de protector" }),
    )

    expect(
      screen.queryByText("Usamos un protector. Tu racha sigue."),
    ).not.toBeInTheDocument()
    expect(getProgressSnapshot().streak.pendingFreezesUsed).toBe(0)

    unmount()
    render(<MissionMap />)
    expect(
      screen.queryByText("Usamos un protector. Tu racha sigue."),
    ).not.toBeInTheDocument()
  })

  test("shows a two-freeze notice beside a milestone and closes only the freeze", async () => {
    const user = userEvent.setup()
    seedStreak({
      current: 3,
      best: 3,
      lastDay: "2026-09-10",
      pendingMilestone: 3,
      pendingFreezesUsed: 2,
    })
    render(<MissionMap />)

    expect(
      screen.getByText("Usamos 2 protectores. Tu racha sigue."),
    ).toBeInTheDocument()
    expect(screen.getByText(/¡Racha de 3 días!/)).toBeInTheDocument()

    await user.click(
      screen.getByRole("button", { name: "Cerrar aviso de protector" }),
    )

    expect(
      screen.queryByText("Usamos 2 protectores. Tu racha sigue."),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/¡Racha de 3 días!/)).toBeInTheDocument()
    expect(getProgressSnapshot().streak.pendingFreezesUsed).toBe(0)
    expect(getProgressSnapshot().streak.pendingMilestone).toBe(3)
  })

  test("hides the reset button without progress", () => {
    render(<MissionMap />)

    expect(
      screen.queryByRole("button", { name: /Reiniciar progreso/ }),
    ).not.toBeInTheDocument()
  })

  test("reset asks for confirmation in a dialog and clears progress", async () => {
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
    expect(getProgressSnapshot()).toEqual({ ...emptyProgress, courseBand: "basic" })
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
