import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test } from "vitest"
import { getProgressSnapshot } from "@/lib/progress/progress-store"
import { supermarketMission } from "../content/mission-01-supermarket"
import { MissionPlayer } from "./mission-player"

async function next(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Continuar" }))
}

async function solveChoice(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "banana" }))
  await next(user)
}

async function solveOrder(user: ReturnType<typeof userEvent.setup>) {
  for (const token of ["I", "want", "to", "buy", "bananas"]) {
    await user.click(screen.getByRole("button", { name: token }))
  }
  await user.click(screen.getByRole("button", { name: "Comprobar" }))
  await next(user)
}

async function solveType(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByLabelText("Tu respuesta en inglés"),
    "i want two bananas",
  )
  await user.click(screen.getByRole("button", { name: "Comprobar" }))
  await next(user)
}

async function playPerfect(user: ReturnType<typeof userEvent.setup>) {
  await next(user)
  await next(user)
  await solveChoice(user)
  await next(user)
  await solveOrder(user)
  await next(user)
  await next(user)
  await solveType(user)
  await next(user)
  await next(user)
  await next(user)
}

describe("MissionPlayer", () => {
  test("completes the mission, awards coins and records progress", async () => {
    const user = userEvent.setup()
    render(<MissionPlayer mission={supermarketMission} />)

    expect(
      await screen.findByText(
        "Llegas a la ciudad con una maleta y veinte dólares en el bolsillo.",
      ),
    ).toBeInTheDocument()

    await playPerfect(user)

    expect(await screen.findByText("¡Misión cumplida!")).toBeInTheDocument()
    expect(screen.getByText("+30")).toBeInTheDocument()
    expect(screen.getByText("+15")).toBeInTheDocument()
    expect(screen.getByText("+45")).toBeInTheDocument()

    await waitFor(() => {
      const progress = getProgressSnapshot()
      expect(progress.coins).toBe(45)
      expect(progress.completed).toContain("supermercado")
    })
  })

  test("replay awards no coins and shows the practice note", async () => {
    const user = userEvent.setup()
    render(<MissionPlayer mission={supermarketMission} />)
    await screen.findByText(
      "Llegas a la ciudad con una maleta y veinte dólares en el bolsillo.",
    )

    await playPerfect(user)
    await user.click(
      await screen.findByRole("button", { name: "Jugar otra vez" }),
    )
    await playPerfect(user)

    expect(
      await screen.findByText(/Ya conocías esta misión/),
    ).toBeInTheDocument()
    expect(
      screen.queryByText("¡Correcto! +10 monedas"),
    ).not.toBeInTheDocument()
    await waitFor(() => {
      expect(getProgressSnapshot().coins).toBe(45)
    })
  })
})
