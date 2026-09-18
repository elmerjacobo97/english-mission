import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test } from "vitest"
import { GrammarNote } from "./grammar-note"

const note = {
  title: "El «to» une dos verbos",
  body: "Cuando hay dos verbos seguidos, el segundo lleva «to»: I want TO buy.",
}

describe("GrammarNote", () => {
  test("shows the title and stays collapsed by default", () => {
    render(<GrammarNote note={note} />)
    expect(
      screen.getByText(`Gramática: ${note.title}`),
    ).toBeInTheDocument()
    const details = screen.getByText(/Gramática/).closest("details")
    expect(details).not.toHaveAttribute("open")
    expect(screen.getByText(note.body)).toBeInTheDocument()
  })

  test("opens and closes when the summary is clicked", async () => {
    const user = userEvent.setup()
    render(<GrammarNote note={note} />)
    const summary = screen.getByText(`Gramática: ${note.title}`)
    const details = summary.closest("details")

    await user.click(summary)
    expect(details).toHaveAttribute("open")

    await user.click(summary)
    expect(details).not.toHaveAttribute("open")
  })

  test("signs the note with the mascot", () => {
    render(<GrammarNote note={note} />)
    expect(screen.getByRole("img", { name: "Coco" })).toBeInTheDocument()
  })
})
