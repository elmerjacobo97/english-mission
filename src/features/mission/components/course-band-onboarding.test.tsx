import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { PLACEMENT_QUESTIONS } from "@/shared/lib/curriculum/placement"
import {
  emptyProgress,
  getProgressSnapshot,
  initProgress,
} from "@/shared/lib/progress/progress-store"
import { CourseBandOnboarding } from "./course-band-onboarding"

const navigation = vi.hoisted(() => ({
  replace: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
}))

describe("CourseBandOnboarding", () => {
  beforeEach(() => {
    initProgress(emptyProgress, "")
    navigation.replace.mockReset()
  })

  test("allows a manual level choice and continues to the map", async () => {
    const user = userEvent.setup()
    render(<CourseBandOnboarding />)

    await user.click(screen.getByRole("button", { name: "Elegir nivel manualmente" }))
    await user.click(screen.getByRole("button", { name: /Avanzado C1/ }))

    await waitFor(() => {
      expect(getProgressSnapshot().courseBand).toBe("advanced")
      expect(navigation.replace).toHaveBeenCalledWith("/")
    })
  })

  test("runs diagnostic and applies recommendation before continuing", async () => {
    const user = userEvent.setup()
    render(<CourseBandOnboarding />)

    expect(screen.getByText("Pregunta 1 de 9")).toBeInTheDocument()

    for (let index = 0; index < PLACEMENT_QUESTIONS.length; index += 1) {
      const question = PLACEMENT_QUESTIONS[index]
      await user.click(
        screen.getByRole("button", { name: question.options[question.correct] }),
      )
      await user.click(
        screen.getByRole("button", {
          name: index === 8 ? "Ver recomendación" : "Siguiente",
        }),
      )
    }

    expect(screen.getByText("Avanzado · C1")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Empezar en Avanzado" }))

    await waitFor(() => {
      expect(getProgressSnapshot().courseBand).toBe("advanced")
      expect(navigation.replace).toHaveBeenCalledWith("/")
    })
  })
})
