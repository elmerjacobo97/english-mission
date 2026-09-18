import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, test, vi } from "vitest"
import {
  getProgressSnapshot,
  recordMissionResult,
} from "@/lib/progress/progress-store"
import { localDayKey } from "@/lib/progress/streak"
import { ShopSession } from "./shop-session"

function completeMissionOne() {
  recordMissionResult("la-llegada", { stars: 1, payout: 0, bestCoins: 0 })
}

function today() {
  return localDayKey(new Date())
}

function pickFirstWord() {
  vi.spyOn(Math, "random").mockReturnValue(0)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("ShopSession", () => {
  test("shows the empty state without completed missions", () => {
    render(<ShopSession />)

    expect(
      screen.getByText("Completa una misión para desbloquear la tienda"),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Ganar monedas" }),
    ).not.toBeInTheDocument()
  })

  test("shows the balance and today's quota with a completed mission", () => {
    completeMissionOne()
    render(<ShopSession />)

    expect(screen.getByText("Tu saldo: 0 monedas")).toBeInTheDocument()
    expect(screen.getByText("Recargas hoy: 0/3")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Ganar monedas" })).toBeEnabled()
  })

  test("a clean answer pays 10 and counts the recharge", async () => {
    const user = userEvent.setup()
    completeMissionOne()
    pickFirstWord()
    render(<ShopSession />)

    await user.click(screen.getByRole("button", { name: "Ganar monedas" }))
    await user.click(screen.getByRole("button", { name: "hello" }))

    expect(screen.getByText("¡Ganaste 10 monedas!")).toBeInTheDocument()
    expect(screen.getByText("Saldo actual: 10 monedas")).toBeInTheDocument()
    expect(getProgressSnapshot().coins).toBe(10)
    expect(getProgressSnapshot().shop).toEqual({ day: today(), count: 1 })
  })

  test("the free hint shows as Pista gratis and lowers the payout to 5", async () => {
    const user = userEvent.setup()
    completeMissionOne()
    pickFirstWord()
    render(<ShopSession />)

    await user.click(screen.getByRole("button", { name: "Ganar monedas" }))
    await user.click(screen.getByRole("button", { name: "Pista gratis" }))
    await user.click(screen.getByRole("button", { name: "hello" }))

    expect(screen.getByText("¡Ganaste 5 monedas!")).toBeInTheDocument()
    expect(getProgressSnapshot().coins).toBe(5)
    expect(getProgressSnapshot().shop).toEqual({ day: today(), count: 1 })
  })

  test("a reveal pays 0, keeps the quota and allows another try", async () => {
    const user = userEvent.setup()
    completeMissionOne()
    pickFirstWord()
    render(<ShopSession />)

    await user.click(screen.getByRole("button", { name: "Ganar monedas" }))
    await user.click(screen.getByRole("button", { name: "goodbye" }))
    await user.click(screen.getByRole("button", { name: "goodbye" }))
    await user.click(screen.getByRole("button", { name: "goodbye" }))

    expect(screen.getByText("Esta vez no ganaste monedas")).toBeInTheDocument()
    expect(getProgressSnapshot().shop).toEqual({ day: null, count: 0 })

    await user.click(screen.getByRole("button", { name: "Recargar otra vez" }))
    expect(
      screen.getByRole("button", { name: "hello" }),
    ).toBeInTheDocument()
  })

  test("after three paid recharges the shop offers Vuelve mañana", async () => {
    const user = userEvent.setup()
    completeMissionOne()
    pickFirstWord()
    const { unmount } = render(<ShopSession />)

    for (let recharge = 0; recharge < 3; recharge += 1) {
      await user.click(
        screen.getByRole("button", {
          name: /Ganar monedas|Recargar otra vez/,
        }),
      )
      await user.click(screen.getByRole("button", { name: "hello" }))
    }

    expect(screen.getByText("¡Ganaste 10 monedas!")).toBeInTheDocument()
    expect(getProgressSnapshot().shop).toEqual({ day: today(), count: 3 })
    expect(screen.getByRole("button", { name: "Vuelve mañana" })).toBeDisabled()

    unmount()
    render(<ShopSession />)
    expect(screen.getByRole("button", { name: "Vuelve mañana" })).toBeDisabled()
    expect(screen.getByText("Recargas hoy: 3/3")).toBeInTheDocument()
  })

  test("recharging does not touch reviews or the streak", async () => {
    const user = userEvent.setup()
    completeMissionOne()
    pickFirstWord()
    render(<ShopSession />)

    await user.click(screen.getByRole("button", { name: "Ganar monedas" }))
    await user.click(screen.getByRole("button", { name: "hello" }))

    expect(getProgressSnapshot().reviews).toEqual({})
    expect(getProgressSnapshot().streak).toEqual({
      current: 0,
      best: 0,
      lastDay: null,
      pendingMilestone: null,
    })
  })
})
