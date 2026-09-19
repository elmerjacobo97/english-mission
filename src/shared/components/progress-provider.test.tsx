import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import {
  emptyProgress,
  getProgressSnapshot,
} from "@/shared/lib/progress/progress-store"
import { ProgressProvider } from "./progress-provider"

describe("ProgressProvider", () => {
  test("hydrates the progress snapshot received from the server", () => {
    const initialProgress = { ...emptyProgress, coins: 42 }

    render(
      <ProgressProvider initialProgress={initialProgress} userId="user-1">
        <span>contenido</span>
      </ProgressProvider>,
    )

    expect(screen.getByText("contenido")).toBeInTheDocument()
    expect(getProgressSnapshot()).toEqual(initialProgress)
  })
})
