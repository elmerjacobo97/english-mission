import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test } from "vitest"
import { addCoins, finishMission } from "@/lib/progress/progress-store"
import { missions } from "../content/mission-catalog"
import type { Mission } from "../types/mission"
import { MissionMap } from "./mission-map"

const firstMission = missions[0]
const secondMission: Mission = {
  ...firstMission,
  slug: "restaurante",
  title: "El restaurante",
  emoji: "🍽️",
}
const catalog = [firstMission, secondMission]

describe("MissionMap", () => {
  test("shows the first mission unlocked and the next one locked", () => {
    render(<MissionMap missions={catalog} />)

    expect(screen.getByRole("link", { name: /Jugar/ })).toBeInTheDocument()
    expect(
      screen.getByText("Completa la misión anterior para desbloquearla"),
    ).toBeInTheDocument()
    expect(screen.getByText("Próximamente")).toBeInTheDocument()
  })

  test("reflects coins and completion from the store", () => {
    addCoins(45)
    finishMission(firstMission.slug, 0)

    render(<MissionMap missions={catalog} />)

    expect(screen.getByText("45")).toBeInTheDocument()
    expect(screen.getByText("COMPLETADA")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Repetir/ })).toBeInTheDocument()
    expect(
      screen.queryByText("Completa la misión anterior para desbloquearla"),
    ).not.toBeInTheDocument()
    expect(screen.getAllByRole("link")).toHaveLength(2)
  })

  test("reset asks for confirmation and clears stored progress", async () => {
    const user = userEvent.setup()
    addCoins(20)
    render(<MissionMap missions={catalog} />)

    await user.click(
      screen.getByRole("button", { name: /Reiniciar progreso/ }),
    )
    expect(
      screen.getByText("Esto borra tus monedas y misiones completadas. ¿Seguro?"),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Sí, borrar todo" }))

    expect(
      screen.queryByText(/¿Seguro\?/),
    ).not.toBeInTheDocument()
    expect(window.localStorage.getItem("english-mission:progress:v1")).toBeNull()
  })

  test("cancel keeps progress", async () => {
    const user = userEvent.setup()
    addCoins(20)
    render(<MissionMap missions={catalog} />)

    await user.click(
      screen.getByRole("button", { name: /Reiniciar progreso/ }),
    )
    await user.click(screen.getByRole("button", { name: "Cancelar" }))

    expect(window.localStorage.getItem("english-mission:progress:v1")).not.toBeNull()
    expect(screen.getByText("20")).toBeInTheDocument()
  })
})
