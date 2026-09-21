import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { StrictMode } from "react"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { findMission } from "@/shared/lib/curriculum/mission-catalog"
import { playSound } from "@/shared/lib/audio"
import { MissionComplete } from "./mission-complete"

vi.mock("@/shared/lib/audio", () => ({
  playSound: vi.fn(),
}))

const mockedPlaySound = vi.mocked(playSound)
const mission = findMission("arrival") ?? (() => {
  throw new Error("la misión arrival no existe en el catálogo")
})()

const props = {
  mission,
  stars: 3 as const,
  earned: 30,
  completionBonus: 15,
  threeStarBonus: 10,
  totalPaid: 55,
  isReplay: false,
  onRestart: vi.fn(),
}

beforeEach(() => {
  mockedPlaySound.mockClear()
  props.onRestart.mockClear()
})

describe("MissionComplete", () => {
  test("plays completion sound once per mount and preserves rewards and navigation", async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <StrictMode>
        <MissionComplete {...props} />
      </StrictMode>,
    )

    expect(mockedPlaySound).toHaveBeenCalledTimes(1)
    expect(mockedPlaySound).toHaveBeenCalledWith("mission-complete")
    expect(screen.getByText("+30")).toBeInTheDocument()
    expect(screen.getByText("+15")).toBeInTheDocument()
    expect(screen.getByText("+10")).toBeInTheDocument()
    expect(screen.getByText("+55")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Volver al mapa" })).toHaveAttribute(
      "href",
      "/",
    )

    rerender(
      <StrictMode>
        <MissionComplete {...props} />
      </StrictMode>,
    )
    expect(mockedPlaySound).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole("button", { name: "Jugar otra vez" }))
    expect(props.onRestart).toHaveBeenCalledTimes(1)
  })
})
