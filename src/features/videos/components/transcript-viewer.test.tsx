import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { TranscriptViewer } from "./transcript-viewer"

const segments = [
  { text: "First line", startMs: 0, durationMs: 1000 },
  { text: "Second line", startMs: 1000, durationMs: 1000 },
]

describe("TranscriptViewer", () => {
  test("highlights active segment and leaves other lines inactive", () => {
    render(<TranscriptViewer segments={segments} activeSegmentIndex={1} />)

    expect(
      screen.getByRole("button", { name: "Saltar a 0:00: First line" }),
    ).not.toHaveAttribute("aria-current")
    expect(
      screen.getByRole("button", { name: "Saltar a 0:01: Second line" }),
    ).toHaveAttribute("aria-current", "true")
  })

  test("seeks when selecting a transcript line", async () => {
    const user = userEvent.setup()
    const onSelectSegment = vi.fn()
    render(
      <TranscriptViewer
        segments={segments}
        activeSegmentIndex={null}
        onSelectSegment={onSelectSegment}
      />,
    )

    await user.click(
      screen.getByRole("button", { name: "Saltar a 0:01: Second line" }),
    )

    expect(onSelectSegment).toHaveBeenCalledWith(segments[1], 1)
  })
})
