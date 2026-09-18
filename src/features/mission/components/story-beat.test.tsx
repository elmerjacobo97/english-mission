import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import type { StoryBeat as StoryBeatData } from "../types/beat"
import { StoryBeat } from "./story-beat"

const youBeat: StoryBeatData = {
  kind: "story",
  es: "Entras a un café a desayunar.",
  en: "Good morning! I want breakfast.",
  speaker: "you",
  character: "cami",
  mood: "happy",
}

const characterBeat: StoryBeatData = {
  kind: "story",
  es: "En la parada, una mujer te saluda.",
  en: "Hello! Are you new here?",
  speaker: "marta",
  character: "marta",
}

describe("StoryBeat", () => {
  test("marks the player's line as spoken by you", () => {
    render(
      <StoryBeat beat={youBeat} speechAvailable={false} englishVisible />,
    )
    expect(screen.getByText("Tú dices")).toBeInTheDocument()
    expect(screen.getByText(`«${youBeat.en}»`)).toBeInTheDocument()
    expect(screen.queryByText(/dice$/)).not.toBeInTheDocument()
  })

  test("attributes character lines to their speaker", () => {
    render(
      <StoryBeat beat={characterBeat} speechAvailable={false} englishVisible />,
    )
    expect(screen.getByText("Marta dice")).toBeInTheDocument()
    expect(screen.getAllByRole("img", { name: "Marta" }).length).toBeGreaterThan(
      0,
    )
  })

  test("shows the scene character with their role", () => {
    render(
      <StoryBeat beat={youBeat} speechAvailable={false} englishVisible />,
    )
    expect(screen.getByText("Cami")).toBeInTheDocument()
    expect(screen.getByText("la chica del café")).toBeInTheDocument()
  })

  test("hides the English text until revealed when the level asks for it", async () => {
    render(
      <StoryBeat beat={youBeat} speechAvailable={false} englishVisible={false} />,
    )
    expect(screen.queryByText(`«${youBeat.en}»`)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Ver texto/ })).toBeInTheDocument()
  })

  test("shows grammar notes open when the note asks for it", () => {
    render(
      <StoryBeat
        beat={{
          ...youBeat,
          note: {
            label: "Cómo funciona",
            open: true,
            title: "Las piezas del juego",
            body: "La historia va en español.",
          },
        }}
        speechAvailable={false}
        englishVisible
      />,
    )
    expect(
      screen.getByText("Cómo funciona: Las piezas del juego"),
    ).toBeInTheDocument()
  })
})
