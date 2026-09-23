import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, test, vi } from "vitest"
import { setMuted } from "@/shared/lib/audio"
import type { StoryBeat as StoryBeatData } from "@/shared/lib/game/types/beat"
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

const vocabularyBeat: StoryBeatData = {
  kind: "story",
  es: "Desayunas en el café.",
  en: "Good morning! I want breakfast.",
  speaker: "you",
  vocab: [
    ["want", "querer"],
    ["breakfast", "desayuno"],
  ],
}

afterEach(() => {
  setMuted(false)
  vi.unstubAllGlobals()
})

describe("StoryBeat", () => {
  test("marks the player's line as spoken by you", () => {
    render(
      <StoryBeat beat={youBeat} speechAvailable={false} englishVisible />,
    )
    expect(screen.getByText("Tú dices")).toBeInTheDocument()
    expect(screen.getByText(`«${youBeat.en}»`)).toHaveAttribute("lang", "en")
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

  test("leaves the scene character to the introduction card", () => {
    render(
      <StoryBeat beat={youBeat} speechAvailable={false} englishVisible />,
    )
    expect(screen.queryByText("Cami")).not.toBeInTheDocument()
    expect(screen.queryByText("la chica del café")).not.toBeInTheDocument()
    expect(screen.queryByRole("img", { name: "Cami" })).not.toBeInTheDocument()
    expect(screen.queryByText("happy")).not.toBeInTheDocument()
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

  test("opens one translated vocabulary popover and returns focus with Escape", async () => {
    const user = userEvent.setup()
    render(
      <StoryBeat beat={vocabularyBeat} speechAvailable={false} englishVisible />,
    )

    const breakfast = screen.getByRole("button", { name: "breakfast" })
    await user.click(breakfast)
    expect(screen.getByRole("dialog", { name: "Vocabulario: breakfast" })).toBeInTheDocument()
    expect(screen.getByText("desayuno")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Escuchar breakfast" })).not.toBeInTheDocument()

    const want = screen.getByRole("button", { name: "want" })
    await user.click(want)
    expect(screen.getAllByRole("dialog")).toHaveLength(1)
    expect(screen.getByText("querer")).toBeInTheDocument()

    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(want).toHaveFocus()

    await user.keyboard("{Enter}")
    expect(screen.getByRole("dialog", { name: "Vocabulario: want" })).toBeInTheDocument()
    await user.keyboard("{Escape}")
    await user.keyboard(" ")
    expect(screen.getByRole("dialog", { name: "Vocabulario: want" })).toBeInTheDocument()
  })

  test("keeps the vocabulary popover open inside and closes it from outside", async () => {
    const user = userEvent.setup()
    render(
      <StoryBeat beat={vocabularyBeat} speechAvailable={false} englishVisible />,
    )

    await user.click(screen.getByRole("button", { name: "breakfast" }))
    await user.click(screen.getByText("desayuno"))
    expect(screen.getByRole("dialog", { name: "Vocabulario: breakfast" })).toBeInTheDocument()

    await user.click(screen.getByText("Desayunas en el café."))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  test("plays vocabulary audio when available and hides it while muted", async () => {
    const user = userEvent.setup()
    const speak = vi.fn()
    vi.stubGlobal("SpeechSynthesisUtterance", class {
      constructor(readonly text: string) {}
      lang = ""
      rate = 0
      voice = null
    })
    vi.stubGlobal("speechSynthesis", {
      cancel: vi.fn(),
      getVoices: () => [],
      speak,
    })
    setMuted(false)
    render(
      <StoryBeat beat={vocabularyBeat} speechAvailable englishVisible />,
    )

    await user.click(screen.getByRole("button", { name: "breakfast" }))
    await user.click(screen.getByRole("button", { name: "Escuchar breakfast" }))
    expect(speak).toHaveBeenCalledTimes(1)

    setMuted(true)
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Escuchar breakfast" })).not.toBeInTheDocument()
    })
    expect(screen.getByText("desayuno")).toBeInTheDocument()
  })

  test("keeps plain dialogues free of vocabulary chips or controls", () => {
    render(<StoryBeat beat={youBeat} speechAvailable={false} englishVisible />)
    expect(screen.queryByRole("button", { name: "breakfast" })).not.toBeInTheDocument()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
