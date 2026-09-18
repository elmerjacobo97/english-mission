import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test } from "vitest"
import { addCoins, recordMissionResult } from "@/lib/progress/progress-store"
import { MissionMap } from "./mission-map"

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
      window.localStorage.getItem("english-mission:progress:v2"),
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
      window.localStorage.getItem("english-mission:progress:v2"),
    ).not.toBeNull()
    expect(screen.getByText("20")).toBeInTheDocument()
  })
})
