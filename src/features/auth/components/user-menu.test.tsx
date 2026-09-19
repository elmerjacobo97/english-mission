import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { UserMenu } from "./user-menu"

const auth = vi.hoisted(() => ({
  signOut: vi.fn(),
}))
const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock("../services/auth.service", () => auth)
vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
}))

describe("UserMenu", () => {
  beforeEach(() => {
    auth.signOut.mockReset()
    auth.signOut.mockResolvedValue({ error: null })
    navigation.push.mockReset()
    navigation.refresh.mockReset()
  })

  test("shows email and signs out to login", async () => {
    const user = userEvent.setup()
    render(<UserMenu email="ana@example.com" />)

    expect(screen.getByText("ana@example.com")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Salir" }))

    expect(auth.signOut).toHaveBeenCalledOnce()
    expect(navigation.push).toHaveBeenCalledWith("/login")
    expect(navigation.refresh).toHaveBeenCalledOnce()
  })
})
