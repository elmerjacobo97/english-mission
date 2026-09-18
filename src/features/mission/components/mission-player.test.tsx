import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test } from "vitest"
import { getMissionProgress } from "@/lib/progress/progress-store"
import { findMission } from "../content/mission-catalog"
import { MissionPlayer } from "./mission-player"

const mission = findMission("la-llegada") ?? (() => {
  throw new Error("la misión la-llegada no existe en el catálogo")
})()

async function next(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Continuar" }))
}

async function solve(
  user: ReturnType<typeof userEvent.setup>,
  option: string,
) {
  await user.click(screen.getByRole("button", { name: option }))
  await next(user)
}

async function playPerfect(user: ReturnType<typeof userEvent.setup>) {
  await next(user)
  await next(user)
  await solve(user, "Hola")
  await next(user)
  await next(user)
  await solve(user, "Thanks")
  await next(user)
  await solve(user, "My name is Alex")
  await next(user)
}

describe("MissionPlayer", () => {
  test("awards three stars and the full payout for a flawless run", async () => {
    const user = userEvent.setup()
    render(<MissionPlayer mission={mission} />)
    await screen.findByText(
      "Llegas a la ciudad en autobús. Es tu primer día: llevas una maleta y un papel con una dirección.",
    )

    await playPerfect(user)

    expect(await screen.findByText("¡Misión cumplida!")).toBeInTheDocument()
    expect(
      screen.getByRole("img", { name: "3 de 3 estrellas" }),
    ).toBeInTheDocument()
    expect(screen.getByText("+30")).toBeInTheDocument()
    expect(screen.getByText("+15")).toBeInTheDocument()
    expect(screen.getByText("+10")).toBeInTheDocument()
    expect(screen.getByText("+55")).toBeInTheDocument()

    await waitFor(() => {
      const progress = getMissionProgress("la-llegada")
      expect(progress.completed).toBe(true)
      expect(progress.stars).toBe(3)
    })
  })

  test("a failed attempt costs a star and the three star bonus", async () => {
    const user = userEvent.setup()
    render(<MissionPlayer mission={mission} />)
    await screen.findByText(
      "Llegas a la ciudad en autobús. Es tu primer día: llevas una maleta y un papel con una dirección.",
    )

    await next(user)
    await next(user)
    await user.click(screen.getByRole("button", { name: "Adiós" }))
    await solve(user, "Hola")
    await next(user)
    await next(user)
    await solve(user, "Thanks")
    await next(user)
    await solve(user, "My name is Alex")
    await next(user)

    expect(await screen.findByText("¡Misión cumplida!")).toBeInTheDocument()
    expect(
      screen.getByRole("img", { name: "2 de 3 estrellas" }),
    ).toBeInTheDocument()
    expect(screen.getByText("+25")).toBeInTheDocument()
    expect(screen.getByText("+40")).toBeInTheDocument()
    await waitFor(() => {
      expect(getMissionProgress("la-llegada").stars).toBe(2)
    })
  })

  test("replay awards no coins and keeps the best stars", async () => {
    const user = userEvent.setup()
    render(<MissionPlayer mission={mission} />)
    await screen.findByText(
      "Llegas a la ciudad en autobús. Es tu primer día: llevas una maleta y un papel con una dirección.",
    )
    await playPerfect(user)
    await user.click(
      await screen.findByRole("button", { name: "Jugar otra vez" }),
    )
    await playPerfect(user)

    expect(
      await screen.findByText(/Ya conocías esta misión/),
    ).toBeInTheDocument()
    await waitFor(() => {
      const progress = getMissionProgress("la-llegada")
      expect(progress.stars).toBe(3)
      expect(progress.bestCoins).toBe(45)
    })
  })
})
