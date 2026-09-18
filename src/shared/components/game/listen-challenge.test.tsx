import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { testProfile } from "@/test/fixtures"
import type { ListenChallenge as ListenChallengeData } from "@/shared/lib/game/types/beat"
import { ListenChallenge } from "./listen-challenge"

const beat: ListenChallengeData = {
  kind: "listen",
  prompt: "Escucha y elige lo que oíste.",
  phrase: "Where is the bus stop?",
  options: ["Where is the bus stop?", "Where is the coffee?", "How much is it?"],
  correct: 0,
}

function setup({
  coins = 0,
  speechAvailable = true,
}: { coins?: number; speechAvailable?: boolean } = {}) {
  const onSolved = vi.fn()
  const onSpendCoins = vi.fn((amount: number) => coins >= amount)
  render(
    <ListenChallenge
      beat={beat}
      coins={coins}
      rewardsEnabled
      profile={testProfile}
      speechAvailable={speechAvailable}
      onSpendCoins={onSpendCoins}
      onSolved={onSolved}
      onContinue={vi.fn()}
    />,
  )
  return { onSolved, onSpendCoins }
}

describe("ListenChallenge", () => {
  test("keeps options disabled until the phrase is played", async () => {
    const user = userEvent.setup()
    setup()
    expect(
      screen.getByRole("button", { name: beat.options[0] }),
    ).toBeDisabled()
    await user.click(screen.getByRole("button", { name: "Reproducir la frase" }))
    expect(
      screen.getByRole("button", { name: beat.options[0] }),
    ).toBeEnabled()
  })

  test("pays the reward for the right option", async () => {
    const user = userEvent.setup()
    const { onSolved } = setup()
    await user.click(screen.getByRole("button", { name: "Reproducir la frase" }))
    await user.click(screen.getByRole("button", { name: beat.options[0] }))
    expect(onSolved).toHaveBeenCalledWith({
      reward: 10,
      wrongAttempts: 0,
      hintUsed: false,
      revealed: false,
    })
  })

  test("shows the phrase text when speech is unavailable", () => {
    setup({ speechAvailable: false })
    expect(screen.getByText(`«${beat.phrase}»`)).toBeInTheDocument()
    expect(
      screen.getByText("Tu navegador no reproduce voz: lee la frase y elige."),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: beat.options[0] }),
    ).toBeEnabled()
  })

  test("hint removes a wrong option", async () => {
    const user = userEvent.setup()
    const { onSpendCoins } = setup({ coins: 5, speechAvailable: false })
    await user.click(screen.getByRole("button", { name: /Pista/ }))
    expect(onSpendCoins).toHaveBeenCalledWith(5)
    expect(
      await screen.findByText("Eliminé una opción incorrecta."),
    ).toBeInTheDocument()
  })
})
