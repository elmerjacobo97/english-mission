import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { ReviewSummary } from "./review-summary"

describe("ReviewSummary", () => {
  test("shows the stats and offers more when words remain", async () => {
    const user = userEvent.setup()
    const onRestart = vi.fn()
    render(
      <ReviewSummary
        stats={{ reviewed: 10, promoted: 8, repeated: 2 }}
        hasMore
        onRestart={onRestart}
      />,
    )

    expect(screen.getByText("Repasadas")).toBeInTheDocument()
    expect(screen.getByText("10")).toBeInTheDocument()
    expect(screen.getByText("8")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Repasar más" }))
    expect(onRestart).toHaveBeenCalled()
  })

  test("hides Repasar más when everything is up to date", () => {
    render(
      <ReviewSummary
        stats={{ reviewed: 3, promoted: 3, repeated: 0 }}
        hasMore={false}
        onRestart={vi.fn()}
      />,
    )

    expect(
      screen.queryByRole("button", { name: "Repasar más" }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Volver al cuaderno" }),
    ).toBeInTheDocument()
  })
})
