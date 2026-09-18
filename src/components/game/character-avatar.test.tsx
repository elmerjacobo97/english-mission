import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { addCoins, selectLook } from "@/lib/progress/progress-store"
import { CHARACTERS } from "../content/characters"
import { CharacterAvatar } from "./character-avatar"

function painted(
  container: HTMLElement,
  color: string,
): Element | null {
  return container.querySelector(`[fill="${color}"]`)
}

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

  test("Coco with lookId paints the look hex and keeps the green skin", () => {
    const { container } = render(
      <CharacterAvatar character="coco" lookId="ocean" />,
    )
    expect(painted(container, "#0d9488")).not.toBeNull()
    expect(painted(container, "#1d4ed8")).not.toBeNull()
    expect(painted(container, "#e0f2fe")).not.toBeNull()
    expect(painted(container, "#1f9d55")).not.toBeNull()
  })

  test("Coco without lookId uses the equipped look", () => {
    addCoins(80)
    selectLook("party")

    const { container } = render(<CharacterAvatar character="coco" />)

    expect(painted(container, "#db2777")).not.toBeNull()
    expect(painted(container, "#06b6d4")).not.toBeNull()
    expect(painted(container, "#fce7f3")).not.toBeNull()
  })

  test("the rest of the cast ignores the equipped look", () => {
    addCoins(80)
    selectLook("party")

    const { container } = render(<CharacterAvatar character="marta" />)

    expect(painted(container, CHARACTERS.marta.shirt)).not.toBeNull()
    expect(painted(container, CHARACTERS.marta.hair)).not.toBeNull()
    expect(painted(container, "#db2777")).toBeNull()
    expect(painted(container, "#06b6d4")).toBeNull()
  })
})
