import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { submitChallengeForm } from "@/test/submit-challenge"
import { testProfile } from "@/test/fixtures"
import type { TypeChallenge as TypeChallengeData } from "../types/beat"
import { TypeChallenge } from "./type-challenge"

const beat: TypeChallengeData = {
  kind: "type",
  prompt: "Escribe en inglés: «Quiero dos bananas.»",
  accepted: ["i want two bananas", "i want 2 bananas"],
  hint: "I want two b______",
}

function setup({ coins = 0 }: { coins?: number } = {}) {
  const onSolved = vi.fn()
  const onContinue = vi.fn()
  const onSpendCoins = vi.fn((amount: number) => coins >= amount)
  render(
    <TypeChallenge
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

async function submit(
  user: ReturnType<typeof userEvent.setup>,
  text: string,
) {
  await user.clear(screen.getByLabelText("Tu respuesta en inglés"))
  await user.type(screen.getByLabelText("Tu respuesta en inglés"), text)
  submitChallengeForm()
}

describe("TypeChallenge", () => {
  test("accepts a small typo and pays the reward", async () => {
    const user = userEvent.setup()
    const { onSolved } = setup()
    await submit(user, "i want two banans")
    expect(onSolved).toHaveBeenCalledWith({
      reward: 10,
      wrongAttempts: 0,
      hintUsed: false,
      revealed: false,
    })
  })

  test("accepts numeric variants", async () => {
    const user = userEvent.setup()
    const { onSolved } = setup()
    await submit(user, "I want 2 bananas!")
    expect(onSolved).toHaveBeenCalledWith({
      reward: 10,
      wrongAttempts: 0,
      hintUsed: false,
      revealed: false,
    })
  })

  test("empty submit asks for an answer without paying", async () => {
    const { onSolved } = setup()
    submitChallengeForm()
    expect(
      await screen.findByText("Escribe tu respuesta antes de comprobar."),
    ).toBeInTheDocument()
    expect(onSolved).not.toHaveBeenCalled()
  })

  test("points at the wrong word", async () => {
    const user = userEvent.setup()
    setup()
    await submit(user, "i want two breads")
    expect(
      await screen.findByText("La palabra «breads» no es correcta."),
    ).toBeInTheDocument()
  })

  test("reveals the answer after three failures and pays nothing", async () => {
    const user = userEvent.setup()
    const { onSolved } = setup()
    await submit(user, "i want two breads")
    await submit(user, "i want two breads")
    await submit(user, "i want two breads")
    expect(onSolved).toHaveBeenCalledWith({
      reward: 0,
      wrongAttempts: 3,
      hintUsed: false,
      revealed: true,
    })
    expect(screen.getByLabelText("Tu respuesta en inglés")).toBeDisabled()
    expect(
      await screen.findByText("La respuesta era: i want two bananas"),
    ).toBeInTheDocument()
  })

  test("hint shows the masked answer and flags the outcome", async () => {
    const user = userEvent.setup()
    const { onSolved, onSpendCoins } = setup({ coins: 5 })
    await user.click(screen.getByRole("button", { name: /Pista/ }))
    expect(onSpendCoins).toHaveBeenCalledWith(5)
    expect(await screen.findByText("I want two b______")).toBeInTheDocument()
    await submit(user, "i want two bananas")
    expect(onSolved).toHaveBeenCalledWith({
      reward: 10,
      wrongAttempts: 0,
      hintUsed: true,
      revealed: false,
    })
  })
})
