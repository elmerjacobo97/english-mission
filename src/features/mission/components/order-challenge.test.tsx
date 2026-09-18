import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import type { OrderChallenge as OrderChallengeData } from "../types/beat"
import { OrderChallenge } from "./order-challenge"

const beat: OrderChallengeData = {
  kind: "order",
  prompt: "Ordena la frase: «Quiero comprar bananas.»",
  tokens: ["to", "I", "bananas", "want", "buy"],
  solution: ["I", "want", "to", "buy", "bananas"],
}

function setup({ coins = 0 }: { coins?: number } = {}) {
  const onSolved = vi.fn()
  const onContinue = vi.fn()
  const onSpendCoins = vi.fn((amount: number) => coins >= amount)
  render(
    <OrderChallenge
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

async function place(
  user: ReturnType<typeof userEvent.setup>,
  token: string,
) {
  await user.click(screen.getByRole("button", { name: token }))
}

describe("OrderChallenge", () => {
  test("pays the full reward for the correct order", async () => {
    const user = userEvent.setup()
    const { onSolved } = setup()
    for (const token of beat.solution) {
      await place(user, token)
    }
    await user.click(screen.getByRole("button", { name: "Comprobar" }))
    expect(onSolved).toHaveBeenCalledWith(10)
  })

  test("wrong order shows retry feedback", async () => {
    const user = userEvent.setup()
    setup()
    for (const token of ["to", "I", "bananas", "want", "buy"]) {
      await place(user, token)
    }
    await user.click(screen.getByRole("button", { name: "Comprobar" }))
    expect(
      await screen.findByText("El orden no es correcto. Inténtalo otra vez."),
    ).toBeInTheDocument()
    expect(screen.getByText("Te quedan 2 intentos.")).toBeInTheDocument()
  })

  test("placed tokens can be removed", async () => {
    const user = userEvent.setup()
    setup()
    await place(user, "I")
    await user.click(screen.getByRole("button", { name: "I" }))
    expect(screen.getByRole("button", { name: "Comprobar" })).toBeDisabled()
  })

  test("hint places the first word so the answer becomes correct", async () => {
    const user = userEvent.setup()
    const { onSolved, onSpendCoins } = setup({ coins: 5 })
    await user.click(screen.getByRole("button", { name: /Pista/ }))
    expect(onSpendCoins).toHaveBeenCalledWith(5)
    expect(await screen.findByText("La palabra 1 es «I».")).toBeInTheDocument()
    for (const token of ["want", "to", "buy", "bananas"]) {
      await place(user, token)
    }
    await user.click(screen.getByRole("button", { name: "Comprobar" }))
    expect(onSolved).toHaveBeenCalledWith(10)
  })
})
