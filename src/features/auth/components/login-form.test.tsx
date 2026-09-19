import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { LoginForm } from "./login-form"

const auth = vi.hoisted(() => ({
  signInWithMagicLink: vi.fn(),
}))

vi.mock("../services/auth.service", () => auth)

describe("LoginForm", () => {
  beforeEach(() => {
    auth.signInWithMagicLink.mockReset()
    auth.signInWithMagicLink.mockResolvedValue({ error: null })
  })

  test("sends a magic link and shows the email notice", async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.type(screen.getByLabelText("Correo electrónico"), "ana@example.com")
    await user.click(screen.getByRole("button", { name: "Enviar enlace" }))

    expect(auth.signInWithMagicLink).toHaveBeenCalledWith("ana@example.com")
    expect(screen.getByRole("heading", { name: "Revisa tu correo" })).toBeInTheDocument()
  })

  test("shows an error when sending fails", async () => {
    auth.signInWithMagicLink.mockResolvedValue({
      error: new Error("rate limited"),
    })
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.type(screen.getByLabelText("Correo electrónico"), "ana@example.com")
    await user.click(screen.getByRole("button", { name: "Enviar enlace" }))

    expect(screen.getByRole("alert")).toHaveTextContent(
      "No pudimos enviar el enlace",
    )
  })

  test("shows callback errors from the confirmation route", () => {
    render(<LoginForm callbackError="missing_code" />)

    expect(screen.getByRole("alert")).toHaveTextContent(
      "El enlace de acceso está incompleto",
    )
  })
})
