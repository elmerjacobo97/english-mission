import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { submitChallengeForm } from "@/test/submit-challenge"
import { testProfile } from "@/test/fixtures"
import type { FillChallenge as FillChallengeData } from "@/shared/lib/game/types/beat"
import { FillChallenge } from "./fill-challenge"

const beat: FillChallengeData = {
  kind: "fill",
  prompt: "Completa la frase que te dijo el señor.",
  sentence: "Go ___ and turn left.",
  answer: "straight",
}

function setup({ coins = 0 }: { coins?: number } = {}) {
  const onSolved = vi.fn()
  const onSpendCoins = vi.fn((amount: number) => coins >= amount)
  render(
    <FillChallenge
      beat={beat}
      coins={coins}
      rewardsEnabled
      profile={testProfile}
      onSpendCoins={onSpendCoins}
      onSolved={onSolved}
      onContinue={vi.fn()}
    />,
  )
  return { onSolved, onSpendCoins }
}

async function type(
  user: ReturnType<typeof userEvent.setup>,
  text: string,
) {
  await user.clear(screen.getByLabelText("Palabra que falta"))
  await user.type(screen.getByLabelText("Palabra que falta"), text)
  submitChallengeForm()
}

describe("FillChallenge", () => {
  test("completes the sentence and pays the reward", async () => {
    const user = userEvent.setup()
    const { onSolved } = setup()
    await type(user, "straight")
    expect(onSolved).toHaveBeenCalledWith({
      reward: 10,
      wrongAttempts: 0,
      hintUsed: false,
      revealed: false,
    })
  })

  test("shows the sentence around the gap", () => {
    setup()
    expect(screen.getByText("Go")).toBeInTheDocument()
    expect(screen.getByText("and turn left.")).toBeInTheDocument()
  })

  test("empty submit asks for the missing word without paying", async () => {
    const { onSolved } = setup()
    submitChallengeForm()
    expect(
      await screen.findByText("Escribe la palabra que falta antes de comprobar."),
    ).toBeInTheDocument()
    expect(onSolved).not.toHaveBeenCalled()
  })

  test("wrong word shows retry feedback", async () => {
    const user = userEvent.setup()
    setup()
    await type(user, "left")
    expect(
      await screen.findByText(
        "Esa palabra no completa la frase. Prueba otra vez.",
      ),
    ).toBeInTheDocument()
  })

  test("hint masks the answer keeping the first letter", async () => {
    const user = userEvent.setup()
    const { onSpendCoins } = setup({ coins: 5 })
    await user.click(screen.getByRole("button", { name: /Pista/ }))
    expect(onSpendCoins).toHaveBeenCalledWith(5)
    expect(
      await screen.findByText("La palabra empieza por «s_______»."),
    ).toBeInTheDocument()
  })
})
