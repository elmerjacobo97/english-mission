import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { submitChallengeForm } from "@/test/submit-challenge"
import { testProfile } from "@/test/fixtures"
import type { OrderChallenge as OrderChallengeData } from "@/shared/lib/game/types/beat"
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
      profile={testProfile}
      onSpendCoins={onSpendCoins}
      onSolved={onSolved}
      onContinue={onContinue}
    />,
  )
  return { onSolved, onContinue, onSpendCoins }
}

async function place(user: ReturnType<typeof userEvent.setup>, token: string) {
  await user.click(screen.getByRole("button", { name: token }))
}

describe("OrderChallenge", () => {
  test("pays the full reward for the correct order", async () => {
    const user = userEvent.setup()
    const { onSolved } = setup()
    for (const token of beat.solution) {
      await place(user, token)
    }
    submitChallengeForm()
    expect(onSolved).toHaveBeenCalledWith({
      reward: 10,
      wrongAttempts: 0,
      hintUsed: false,
      revealed: false,
    })
  })

  test("wrong order shows retry feedback", async () => {
    const user = userEvent.setup()
    setup()
    for (const token of ["to", "I", "bananas", "want", "buy"]) {
      await place(user, token)
    }
    submitChallengeForm()
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
    expect(screen.getByText("Toca las palabras en orden")).toBeInTheDocument()
    submitChallengeForm()
    expect(
      await screen.findByText("Coloca todas las palabras antes de comprobar."),
    ).toBeInTheDocument()
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
    submitChallengeForm()
    expect(onSolved).toHaveBeenCalledWith({
      reward: 10,
      wrongAttempts: 0,
      hintUsed: true,
      revealed: false,
    })
  })

  test("reveals the solution on the last attempt", async () => {
    const user = userEvent.setup()
    const { onSolved } = setup()
    for (const token of ["to", "I", "bananas", "want", "buy"]) {
      await place(user, token)
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      submitChallengeForm()
    }
    expect(onSolved).toHaveBeenCalledWith({
      reward: 0,
      wrongAttempts: 3,
      hintUsed: false,
      revealed: true,
    })
    expect(
      await screen.findByText("La respuesta era: I want to buy bananas"),
    ).toBeInTheDocument()
  })
})
