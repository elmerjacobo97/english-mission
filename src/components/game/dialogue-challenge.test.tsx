import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { testProfile } from "@/test/fixtures"
import type { DialogueChallenge as DialogueChallengeData } from "../types/beat"
import { DialogueChallenge } from "./dialogue-challenge"

const beat: DialogueChallengeData = {
  kind: "dialogue",
  prompt: "El dependiente te saluda. ¿Qué respondes?",
  line: "Hello! Can I help you?",
  options: ["Yes, please. I'm looking for bread.", "Goodbye!", "Here is the money."],
  correct: 0,
}

function setup({ coins = 0 }: { coins?: number } = {}) {
  const onSolved = vi.fn()
  const onSpendCoins = vi.fn((amount: number) => coins >= amount)
  render(
    <DialogueChallenge
      beat={beat}
      coins={coins}
      rewardsEnabled
      profile={testProfile}
      speechAvailable={false}
      onSpendCoins={onSpendCoins}
      onSolved={onSolved}
      onContinue={vi.fn()}
    />,
  )
  return { onSolved, onSpendCoins }
}

describe("DialogueChallenge", () => {
  test("shows the other person's line", () => {
    setup()
    expect(screen.getByText(`«${beat.line}»`)).toBeInTheDocument()
  })

  test("pays the reward for the right reply", async () => {
    const user = userEvent.setup()
    const { onSolved } = setup()
    await user.click(screen.getByRole("button", { name: beat.options[0] }))
    expect(onSolved).toHaveBeenCalledWith({
      reward: 10,
      wrongAttempts: 0,
      hintUsed: false,
      revealed: false,
    })
  })

  test("wrong reply shows retry feedback", async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole("button", { name: beat.options[1] }))
    expect(
      await screen.findByText("Esa respuesta no encaja en la conversación."),
    ).toBeInTheDocument()
  })

  test("hint removes a wrong reply", async () => {
    const user = userEvent.setup()
    const { onSpendCoins } = setup({ coins: 5 })
    await user.click(screen.getByRole("button", { name: /Pista/ }))
    expect(onSpendCoins).toHaveBeenCalledWith(5)
    expect(
      await screen.findByText("Eliminé una respuesta incorrecta."),
    ).toBeInTheDocument()
  })
})
