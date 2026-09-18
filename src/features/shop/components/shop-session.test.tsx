import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, test, vi } from "vitest"
import {
  addCoins,
  getProgressSnapshot,
  recordMissionResult,
} from "@/shared/lib/progress/progress-store"
import { localDayKey } from "@/shared/lib/progress/streak"
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
  test("shows the empty recharge state and the catalog without completed missions", () => {
    render(<ShopSession />)

    expect(
      screen.getByRole("heading", { name: "Tienda" }),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Completa una misión para desbloquear la recarga"),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Ganar monedas" }),
    ).not.toBeInTheDocument()
    expect(screen.getByText("Looks de Coco")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Comprar Océano · 25" }),
    ).toBeInTheDocument()
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

  test("buying Océano with 25 coins leaves the balance at 0 and the card equipped", async () => {
    const user = userEvent.setup()
    completeMissionOne()
    addCoins(25)
    render(<ShopSession />)

    await user.click(
      screen.getByRole("button", { name: "Comprar Océano · 25" }),
    )

    expect(screen.getByText("Tu saldo: 0 monedas")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Equipado" })).toBeInTheDocument()
    expect(getProgressSnapshot().looks).toEqual({
      owned: ["ocean"],
      equipped: "ocean",
    })
    const stored = JSON.parse(
      window.localStorage.getItem("english-mission:progress:v6") ?? "{}",
    ) as { looks?: unknown }
    expect(stored.looks).toEqual({ owned: ["ocean"], equipped: "ocean" })
  })

  test("Usar in Coco clásico re-equips without changing the balance", async () => {
    const user = userEvent.setup()
    completeMissionOne()
    addCoins(25)
    render(<ShopSession />)

    await user.click(
      screen.getByRole("button", { name: "Comprar Océano · 25" }),
    )
    await user.click(
      screen.getByRole("button", { name: "Usar Coco clásico" }),
    )

    expect(getProgressSnapshot().coins).toBe(0)
    expect(getProgressSnapshot().looks).toEqual({
      owned: ["ocean"],
      equipped: "classic",
    })
    expect(screen.getByRole("button", { name: "Equipado" })).toBeInTheDocument()
  })

  test("buying Fiesta with 25 coins is disabled", () => {
    completeMissionOne()
    addCoins(25)
    render(<ShopSession />)

    expect(
      screen.getByRole("button", { name: "Comprar Fiesta · 80" }),
    ).toBeDisabled()
    expect(
      screen.getByRole("button", { name: "Comprar Océano · 25" }),
    ).toBeEnabled()
  })

  test("the catalog hides during the recharge exercise and comes back after", async () => {
    const user = userEvent.setup()
    completeMissionOne()
    pickFirstWord()
    render(<ShopSession />)

    await user.click(screen.getByRole("button", { name: "Ganar monedas" }))

    expect(screen.queryByText("Looks de Coco")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Comprar Océano · 25" }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "hello" }))

    expect(screen.getByText("Looks de Coco")).toBeInTheDocument()
  })

  test("buying a look does not touch reviews, the streak or the recharge quota", async () => {
    const user = userEvent.setup()
    completeMissionOne()
    addCoins(25)
    render(<ShopSession />)

    await user.click(
      screen.getByRole("button", { name: "Comprar Océano · 25" }),
    )

    expect(getProgressSnapshot().reviews).toEqual({})
    expect(getProgressSnapshot().streak).toEqual({
      current: 0,
      best: 0,
      lastDay: null,
      pendingMilestone: null,
    })
    expect(getProgressSnapshot().shop).toEqual({ day: null, count: 0 })
    expect(screen.getByText("Recargas hoy: 0/3")).toBeInTheDocument()
  })
})
