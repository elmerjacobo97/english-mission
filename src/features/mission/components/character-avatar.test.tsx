import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { CHARACTERS } from "../content/characters"
import { CharacterAvatar } from "./character-avatar"

describe("CharacterAvatar", () => {
  test("exposes the character name for assistive tech", () => {
    render(<CharacterAvatar character="marta" mood="happy" />)
    expect(screen.getByRole("img", { name: "Marta" })).toBeInTheDocument()
  })

  test("renders every configured character", () => {
    for (const [id, config] of Object.entries(CHARACTERS)) {
      const { unmount } = render(
        <CharacterAvatar character={id as keyof typeof CHARACTERS} />,
      )
      expect(
        screen.getByRole("img", { name: config.name }),
        id,
      ).toBeInTheDocument()
      unmount()
    }
  })

  test("accepts a custom size", () => {
    render(<CharacterAvatar character="coco" size={96} />)
    expect(screen.getByRole("img", { name: "Coco" })).toHaveAttribute(
      "width",
      "96",
    )
  })
})
