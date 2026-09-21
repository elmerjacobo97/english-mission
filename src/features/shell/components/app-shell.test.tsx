import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { isMuted, setMuted } from "@/shared/lib/audio"
import { addCoins, recordMissionResult } from "@/shared/lib/progress/progress-store"
import { stopSpeaking } from "@/shared/lib/speech"
import { AppShell } from "./app-shell"

const pathname = { current: "/" }

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
}))

vi.mock("@/shared/lib/speech", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/lib/speech")>()
  return { ...actual, stopSpeaking: vi.fn() }
})

describe("AppShell", () => {
  beforeEach(() => {
    pathname.current = "/"
    setMuted(false)
    vi.mocked(stopSpeaking).mockClear()
  })

  test("renders the four destinations and the content", () => {
    render(<AppShell>contenido de la página</AppShell>)

    const nav = screen.getByRole("navigation", { name: "Navegación" })
    expect(within(nav).getAllByRole("link")).toHaveLength(4)
    expect(within(nav).getByRole("link", { name: "Mapa" })).toHaveAttribute(
      "href",
      "/",
    )
    expect(within(nav).getByRole("link", { name: "Cuaderno" })).toHaveAttribute(
      "href",
      "/notebook",
    )
    expect(within(nav).getByRole("link", { name: /Repaso/ })).toHaveAttribute(
      "href",
      "/review",
    )
    expect(within(nav).getByRole("link", { name: "Tienda" })).toHaveAttribute(
      "href",
      "/shop",
    )
    expect(screen.getByText("contenido de la página")).toBeInTheDocument()
  })

  test("marks only the current route as the active page", () => {
    pathname.current = "/notebook"
    render(<AppShell>contenido</AppShell>)

    const nav = screen.getByRole("navigation", { name: "Navegación" })
    expect(within(nav).getByRole("link", { name: "Cuaderno" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    expect(
      within(nav).getByRole("link", { name: "Mapa" }),
    ).not.toHaveAttribute("aria-current")
    expect(
      within(nav).getByRole("link", { name: /Repaso/ }),
    ).not.toHaveAttribute("aria-current")
  })

  test("shows coins and streak in the header", () => {
    addCoins(40)
    render(<AppShell>contenido</AppShell>)

    expect(screen.getByLabelText("Monedas: 40")).toBeInTheDocument()
    expect(screen.getByLabelText(/Récord: 0 días/)).toBeInTheDocument()
  })

  test("shows audio enabled by default and toggles its accessible state", async () => {
    const user = userEvent.setup()
    render(<AppShell>contenido</AppShell>)

    const audioButton = screen.getByRole("button", { name: "Silenciar audio" })
    expect(audioButton).toHaveAttribute("aria-pressed", "false")
    expect(isMuted()).toBe(false)

    await user.click(audioButton)

    expect(
      screen.getByRole("button", { name: "Activar audio" }),
    ).toHaveAttribute("aria-pressed", "true")
    expect(isMuted()).toBe(true)
    expect(stopSpeaking).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole("button", { name: "Activar audio" }))

    expect(
      screen.getByRole("button", { name: "Silenciar audio" }),
    ).toHaveAttribute("aria-pressed", "false")
    expect(isMuted()).toBe(false)
    expect(stopSpeaking).toHaveBeenCalledTimes(1)
  })

  test("renders the account slot in the header", () => {
    render(
      <AppShell account={<span>ana@example.com</span>}>contenido</AppShell>,
    )

    expect(screen.getByText("ana@example.com")).toBeInTheDocument()
  })

  test("badges the review tab with the due count", () => {
    recordMissionResult("arrival", { stars: 1, payout: 0, bestCoins: 0 })
    render(<AppShell>contenido</AppShell>)

    const reviewLink = screen.getByRole("link", { name: /Repaso/ })
    expect(within(reviewLink).getByText(/^\d+$/)).toBeInTheDocument()
  })

  test("shows no badge without due words", () => {
    render(<AppShell>contenido</AppShell>)

    const reviewLink = screen.getByRole("link", { name: "Repaso" })
    expect(within(reviewLink).queryByText(/^\d+$/)).not.toBeInTheDocument()
  })

  test("shows the app version", () => {
    render(<AppShell>contenido</AppShell>)

    expect(screen.getByText(/^Versión \d+\.\d+\.\d+$/)).toBeInTheDocument()
  })
})
