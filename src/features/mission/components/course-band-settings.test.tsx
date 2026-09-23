import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, test } from "vitest"
import {
  emptyProgress,
  getProgressSnapshot,
  initProgress,
} from "@/shared/lib/progress/progress-store"
import { CourseBandSettings } from "./course-band-settings"

describe("CourseBandSettings", () => {
  beforeEach(() => {
    initProgress({ ...emptyProgress, courseBand: "basic" }, "")
  })

  test("changes route without clearing progress", async () => {
    const user = userEvent.setup()
    initProgress(
      {
        ...emptyProgress,
        courseBand: "basic",
        coins: 20,
        missions: {
          arrival: { completed: true, stars: 2, bestCoins: 20 },
        },
      },
      "",
    )
    render(<CourseBandSettings />)

    await user.click(screen.getByRole("button", { name: /Intermedio B1–B2/ }))

    expect(getProgressSnapshot()).toMatchObject({
      courseBand: "intermediate",
      coins: 20,
      missions: {
        arrival: { completed: true, stars: 2, bestCoins: 20 },
      },
    })
  })

  test("opens diagnostic from settings", async () => {
    const user = userEvent.setup()
    render(<CourseBandSettings />)

    await user.click(screen.getByRole("button", { name: "Hacer diagnóstico" }))

    expect(screen.getByText("Pregunta 1 de 9")).toBeInTheDocument()
  })
})
