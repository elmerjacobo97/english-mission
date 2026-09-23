import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, test, vi } from "vitest"
import { getMissionProgress, getProgressSnapshot } from "@/shared/lib/progress/progress-store"
import { findMission } from "@/shared/lib/curriculum/mission-catalog"
import { MissionPlayer } from "./mission-player"

const mission = findMission("arrival") ?? (() => {
  throw new Error("la misión arrival no existe en el catálogo")
})()

const busMission = findMission("bus") ?? (() => {
  throw new Error("la misión bus no existe en el catálogo")
})()

const landlordMission = findMission("landlord") ?? (() => {
  throw new Error("la misión landlord no existe en el catálogo")
})()
const userId = "test-account"

async function next(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Continuar" }))
}

async function solve(
  user: ReturnType<typeof userEvent.setup>,
  option: string,
) {
  await user.click(screen.getByRole("button", { name: option }))
  await next(user)
}

async function playPerfect(user: ReturnType<typeof userEvent.setup>) {
  await next(user)
  await next(user)
  await solve(user, "Hola")
  await next(user)
  await solve(user, "My name is Alex")
  await next(user)
  await solve(user, "Thanks")
  await next(user)
  await next(user)
}

describe("MissionPlayer", () => {
  afterEach(() => vi.unstubAllGlobals())

  test("shows mission title, description, and link back to the map", () => {
    render(<MissionPlayer mission={landlordMission} userId={userId} />)

    expect(
      screen.getByRole("heading", { name: "Llamar al dueño" }),
    ).toBeInTheDocument()
    expect(screen.getByText("El alquiler y una fuga")).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Volver al mapa" }),
    ).toHaveAttribute("href", "/")
  })

  test("awards three stars and the full payout for a flawless run", async () => {
    const user = userEvent.setup()
    render(<MissionPlayer mission={mission} userId={userId} />)
    await screen.findByText(
      "Llegas a la ciudad en autobús. Es tu primer día: llevas una maleta y un papel con una dirección.",
    )

    await playPerfect(user)

    expect(await screen.findByText("¡Misión cumplida!")).toBeInTheDocument()
    expect(
      screen.getByRole("img", { name: "3 de 3 estrellas" }),
    ).toBeInTheDocument()
    expect(screen.getByText("+30")).toBeInTheDocument()
    expect(screen.getByText("+15")).toBeInTheDocument()
    expect(screen.getByText("+10")).toBeInTheDocument()
    expect(screen.getByText("+55")).toBeInTheDocument()

    await waitFor(() => {
      const progress = getMissionProgress("arrival")
      expect(progress.completed).toBe(true)
      expect(progress.stars).toBe(3)
    })
  })

  test("a failed attempt costs a star and the three star bonus", async () => {
    const user = userEvent.setup()
    render(<MissionPlayer mission={mission} userId={userId} />)
    await screen.findByText(
      "Llegas a la ciudad en autobús. Es tu primer día: llevas una maleta y un papel con una dirección.",
    )

    await next(user)
    await next(user)
    await user.click(screen.getByRole("button", { name: "Adiós" }))
    await solve(user, "Hola")
    await next(user)
    await solve(user, "My name is Alex")
    await next(user)
    await solve(user, "Thanks")
    await next(user)
    await next(user)

    expect(await screen.findByText("¡Misión cumplida!")).toBeInTheDocument()
    expect(
      screen.getByRole("img", { name: "2 de 3 estrellas" }),
    ).toBeInTheDocument()
    expect(screen.getByText("+25")).toBeInTheDocument()
    expect(screen.getByText("+40")).toBeInTheDocument()
    await waitFor(() => {
      expect(getMissionProgress("arrival").stars).toBe(2)
    })
  })

  test("back button is disabled on the first step", async () => {
    render(<MissionPlayer mission={mission} userId={userId} />)
    await screen.findByText(
      "Llegas a la ciudad en autobús. Es tu primer día: llevas una maleta y un papel con una dirección.",
    )
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled()
    expect(screen.getByText("Paso 1 de 9")).toBeInTheDocument()
  })

  test("moves focus to the new beat after changing steps", async () => {
    const user = userEvent.setup()
    render(<MissionPlayer mission={mission} userId={userId} />)

    await screen.findByText(
      "Llegas a la ciudad en autobús. Es tu primer día: llevas una maleta y un papel con una dirección.",
    )
    await next(user)

    expect(screen.getByRole("group", { name: "Paso 2 de 9" })).toHaveFocus()
  })

  test("Coco conversation survives closing without changing the active challenge", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          reply: {
            explanation: "Usamos do para preguntas.",
            correction: null,
            example: { english: "Do you like tea?", spanish: "¿Te gusta el té?" },
            curiosity: null,
          },
        }),
      })
    vi.stubGlobal("fetch", fetchMock)
    const user = userEvent.setup()
    const before = getProgressSnapshot()
    render(<MissionPlayer mission={mission} userId={userId} />)
    await screen.findByText(
      "Llegas a la ciudad en autobús. Es tu primer día: llevas una maleta y un papel con una dirección.",
    )
    await next(user)
    await next(user)
    expect(screen.getByText("Paso 3 de 9")).toBeInTheDocument()

    const progressRow = screen.getByRole("progressbar").parentElement
    expect(
      within(progressRow!).getByRole("button", { name: "Pregúntale a Coco" }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Pregúntale a Coco" }))
    await user.type(
      screen.getByRole("textbox", { name: "Tu pregunta para Coco" }),
      "How do I ask a question?",
    )
    await user.click(screen.getByRole("button", { name: "Preguntar" }))
    expect(await screen.findByText("Usamos do para preguntas.")).toBeInTheDocument()
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toMatchObject({
      missionSlug: "arrival",
      beatIndex: 2,
    })
    expect(screen.getByText("Paso 3 de 9")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Cerrar tutor" }))
    expect(screen.queryByRole("log", { name: "Conversación con Coco" })).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Pregúntale a Coco" }))
    expect(screen.getByText("How do I ask a question?")).toBeInTheDocument()
    expect(screen.getByText("Paso 3 de 9")).toBeInTheDocument()
    expect(getProgressSnapshot()).toEqual(before)
  })

  test("introduces a character once, keeps it seen when going back, and skips beats without one", async () => {
    const user = userEvent.setup()
    const before = getProgressSnapshot()
    render(<MissionPlayer mission={mission} userId={userId} />)

    await screen.findByText(
      "Llegas a la ciudad en autobús. Es tu primer día: llevas una maleta y un papel con una dirección.",
    )
    expect(screen.queryByRole("complementary", { name: "Presentación de Marta" })).not.toBeInTheDocument()

    await next(user)
    const introduction = screen.getByRole("complementary", { name: "Presentación de Marta" })
    expect(introduction).toBeInTheDocument()
    expect(
      screen.getAllByRole("img", { name: "Marta" }).filter(
        (avatar) => avatar.getAttribute("data-variant") === "portrait",
      ),
    ).toHaveLength(1)
    expect(within(introduction).getByText("Vecina y primera aliada del estudiante.")).toBeInTheDocument()
    expect(within(introduction).getByText("Acogedora")).toBeInTheDocument()

    await next(user)
    expect(screen.queryByRole("complementary", { name: "Presentación de Marta" })).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Anterior" }))
    expect(screen.queryByRole("complementary", { name: "Presentación de Marta" })).not.toBeInTheDocument()
    expect(getProgressSnapshot()).toEqual(before)
  })

  test("clears introductions when replaying the mission", async () => {
    const user = userEvent.setup()
    render(<MissionPlayer mission={mission} userId={userId} />)
    await screen.findByText(
      "Llegas a la ciudad en autobús. Es tu primer día: llevas una maleta y un papel con una dirección.",
    )
    await playPerfect(user)
    await user.click(await screen.findByRole("button", { name: "Jugar otra vez" }))
    await next(user)
    expect(screen.getByRole("complementary", { name: "Presentación de Marta" })).toBeInTheDocument()
  })

  test("reviewing a solved step pays nothing twice", async () => {
    const user = userEvent.setup()
    render(<MissionPlayer mission={mission} userId={userId} />)
    await screen.findByText(
      "Llegas a la ciudad en autobús. Es tu primer día: llevas una maleta y un papel con una dirección.",
    )

    await next(user)
    await next(user)
    await solve(user, "Hola")
    expect(getProgressSnapshot().coins).toBe(10)

    await user.click(screen.getByRole("button", { name: "Anterior" }))
    expect(
      await screen.findByText("Ya superaste esta prueba."),
    ).toBeInTheDocument()
    expect(getProgressSnapshot().coins).toBe(10)

    await user.click(screen.getByRole("button", { name: /Continuar/ }))
    await user.click(screen.getByRole("button", { name: "Anterior" }))
    await user.click(screen.getByRole("button", { name: "Anterior" }))
    await user.click(screen.getByRole("button", { name: "Anterior" }))
    expect(screen.getByText("Paso 1 de 9")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled()

    await next(user)
    await next(user)
    expect(
      await screen.findByText("Ya superaste esta prueba."),
    ).toBeInTheDocument()
    expect(getProgressSnapshot().coins).toBe(10)
  })

  test("replay awards no coins and keeps the best stars", async () => {
    const user = userEvent.setup()
    render(<MissionPlayer mission={mission} userId={userId} />)
    await screen.findByText(
      "Llegas a la ciudad en autobús. Es tu primer día: llevas una maleta y un papel con una dirección.",
    )
    await playPerfect(user)
    await user.click(
      await screen.findByRole("button", { name: "Jugar otra vez" }),
    )
    await playPerfect(user)

    expect(
      await screen.findByText(/Ya conocías esta misión/),
    ).toBeInTheDocument()
    await waitFor(() => {
      const progress = getMissionProgress("arrival")
      expect(progress.stars).toBe(3)
      expect(progress.bestCoins).toBe(45)
    })
  })

  test("completing a mission raises the streak once per day", async () => {
    const user = userEvent.setup()
    render(<MissionPlayer mission={mission} userId={userId} />)
    await screen.findByText(
      "Llegas a la ciudad en autobús. Es tu primer día: llevas una maleta y un papel con una dirección.",
    )
    await playPerfect(user)

    await waitFor(() => {
      expect(getProgressSnapshot().streak.current).toBe(1)
      expect(getProgressSnapshot().streak.best).toBe(1)
    })

    await user.click(
      await screen.findByRole("button", { name: "Jugar otra vez" }),
    )
    await playPerfect(user)
    expect(
      await screen.findByText(/Ya conocías esta misión/),
    ).toBeInTheDocument()
    expect(getProgressSnapshot().streak.current).toBe(1)

  })

  test("introduces the bus driver with the opening scene", async () => {
    render(<MissionPlayer mission={busMission} userId={userId} />)

    await screen.findByText(
      "Sales del café y llegas a la parada. La entrevista es en otro barrio.",
    )
    expect(
      screen.getByRole("complementary", { name: "Presentación de El chofer" }),
    ).toBeInTheDocument()
  })
})
