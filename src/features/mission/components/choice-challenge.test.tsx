import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import type { ChoiceChallenge as ChoiceChallengeData } from "../types/beat"
import { ChoiceChallenge } from "./choice-challenge"

const beat: ChoiceChallengeData = {
  kind: "choice",
  prompt: "¿Cuál de estas palabras significa 🍌?",
  options: ["apple", "banana", "bread"],
  correct: 1,
}

function setup({ coins = 0 }: { coins?: number } = {}) {
  const onSolved = vi.fn()
  const onContinue = vi.fn()
  const onSpendCoins = vi.fn((amount: number) => coins >= amount)
  render(
    <ChoiceChallenge
      beat={beat}
      coins={coins}
      rewardsEnabled
      onSpendCoins={onSpendCoins}
      onSolved={onSolved}
      onContinue={onContinue}
    />,
  )
  return { onSolved, onContinue, onSpendCoins }
}

describe("ChoiceChallenge", () => {
  test("pays the full reward on the first try", async () => {
    const user = userEvent.setup()
    const { onSolved } = setup()
    await user.click(screen.getByRole("button", { name: "banana" }))
    expect(onSolved).toHaveBeenCalledWith(10)
    expect(
      await screen.findByText("¡Correcto! +10 monedas"),
    ).toBeInTheDocument()
  })

  test("wrong answers show retry feedback and consume attempts", async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole("button", { name: "apple" }))
    expect(
      await screen.findByText("Todavía no. Inténtalo otra vez."),
    ).toBeInTheDocument()
    expect(screen.getByText("Te quedan 2 intentos.")).toBeInTheDocument()
    expect(
      screen.getByRole("img", { name: "Intentos fallidos: 1 de 3" }),
    ).toBeInTheDocument()
  })

  test("pays half the reward after a failed attempt", async () => {
    const user = userEvent.setup()
    const { onSolved } = setup()
    await user.click(screen.getByRole("button", { name: "bread" }))
    await user.click(screen.getByRole("button", { name: "banana" }))
    expect(onSolved).toHaveBeenCalledWith(5)
  })

  test("reveals the answer after three failures and pays nothing", async () => {
    const user = userEvent.setup()
    const { onSolved } = setup()
    await user.click(screen.getByRole("button", { name: "apple" }))
    await user.click(screen.getByRole("button", { name: "bread" }))
    await user.click(screen.getByRole("button", { name: "apple" }))
    expect(onSolved).toHaveBeenCalledWith(0)
    expect(
      await screen.findByText("La respuesta era: banana"),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Continuar" }),
    ).toBeInTheDocument()
  })

  test("hint spends coins and hides a wrong option", async () => {
    const user = userEvent.setup()
    const { onSpendCoins } = setup({ coins: 5 })
    await user.click(screen.getByRole("button", { name: /Pista/ }))
    expect(onSpendCoins).toHaveBeenCalledWith(5)
    expect(
      await screen.findByText("Eliminé una opción incorrecta."),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "apple" })).toHaveClass(
      "invisible",
    )
  })

  test("hint stays disabled without coins", () => {
    setup({ coins: 0 })
    expect(screen.getByRole("button", { name: /Pista/ })).toBeDisabled()
  })
})
