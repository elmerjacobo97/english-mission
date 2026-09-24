import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, test, vi } from "vitest"

import type { RehearsalSession } from "../types"
import { RehearsalsPage } from "./rehearsals-page"

const push = vi.fn()
const refresh = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }))

const fetchMock = vi.fn()

function response(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response
}

const session: RehearsalSession = {
  id: "session-1",
  userId: "user-1",
  situation: "Pedir un café en una cafetería de Nueva York",
  objective: "Pedir una bebida y confirmar el precio",
  characterRole: "Barista de una cafetería",
  courseBand: "basic",
  status: "ready",
  messages: [
    { id: "m1", kind: "character_reply", content: "Hi! What can I get you?" },
  ],
  feedback: null,
  sourceSessionId: null,
  createdAt: "2026-09-23T10:00:00.000Z",
  updatedAt: "2026-09-23T10:00:00.000Z",
}

beforeEach(() => {
  fetchMock.mockReset()
  push.mockReset()
  refresh.mockReset()
  vi.stubGlobal("fetch", fetchMock)
})

describe("RehearsalsPage", () => {
  test("prepares a scenario from the situation and objective", async () => {
    fetchMock.mockResolvedValueOnce(response({ session }, 201))
    const user = userEvent.setup()
    render(<RehearsalsPage initialSessions={[]} />)

    await user.type(
      screen.getByLabelText("¿Qué situación quieres practicar?"),
      session.situation,
    )
    await user.type(
      screen.getByLabelText("¿Qué quieres lograr?"),
      session.objective,
    )
    await user.click(screen.getByRole("button", { name: "Preparar ensayo" }))

    const review = await screen.findByRole("region", { name: "Antes de comenzar" })
    expect(within(review).getByText("Barista de una cafetería")).toBeInTheDocument()
    expect(within(review).getByText(session.objective)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith("/api/rehearsals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        situation: session.situation,
        objective: session.objective,
      }),
    })
  })

  test("starts the prepared rehearsal and opens it", async () => {
    fetchMock
      .mockResolvedValueOnce(response({ session }, 201))
      .mockResolvedValueOnce(
        response({ session: { ...session, status: "in_progress" } }),
      )
    const user = userEvent.setup()
    render(<RehearsalsPage initialSessions={[]} />)

    await user.type(
      screen.getByLabelText("¿Qué situación quieres practicar?"),
      session.situation,
    )
    await user.type(screen.getByLabelText("¿Qué quieres lograr?"), session.objective)
    await user.click(screen.getByRole("button", { name: "Preparar ensayo" }))
    await user.click(await screen.findByRole("button", { name: "Comenzar ensayo" }))

    expect(push).toHaveBeenCalledWith("/rehearsals/session-1")
    expect(fetchMock).toHaveBeenLastCalledWith("/api/rehearsals/session-1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    })
  })

  test("keeps the form and offers retry when AI is unavailable", async () => {
    fetchMock.mockResolvedValueOnce(
      response(
        {
          error: {
            code: "ai-unavailable",
            message: "Coco no pudo responder. Intenta de nuevo.",
          },
        },
        503,
      ),
    )
    const user = userEvent.setup()
    render(<RehearsalsPage initialSessions={[]} />)

    await user.type(screen.getByLabelText("¿Qué situación quieres practicar?"), "x")
    await user.type(screen.getByLabelText("¿Qué quieres lograr?"), "y")
    await user.click(screen.getByRole("button", { name: "Preparar ensayo" }))

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveAttribute("data-error-code", "ai-unavailable")
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument()
    expect(screen.getByLabelText("¿Qué situación quieres practicar?")).toHaveValue(
      "x",
    )
  })

  test("explains the daily limit without retrying", async () => {
    fetchMock.mockResolvedValueOnce(
      response(
        {
          error: {
            code: "daily-limit",
            message:
              "Alcanzaste el límite diario de 50 generaciones. Podrás continuar después del reinicio diario (UTC).",
          },
        },
        429,
      ),
    )
    const user = userEvent.setup()
    render(<RehearsalsPage initialSessions={[]} />)

    await user.type(screen.getByLabelText("¿Qué situación quieres practicar?"), "x")
    await user.type(screen.getByLabelText("¿Qué quieres lograr?"), "y")
    await user.click(screen.getByRole("button", { name: "Preparar ensayo" }))

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("reinicio diario (UTC)")
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument()
  })

  test("can prepare a rehearsal with the keyboard only", async () => {
    fetchMock.mockResolvedValueOnce(response({ session }, 201))
    const user = userEvent.setup()
    render(<RehearsalsPage initialSessions={[]} />)

    await user.type(
      screen.getByLabelText("¿Qué situación quieres practicar?"),
      session.situation,
    )
    await user.tab()
    await user.type(screen.getByLabelText("¿Qué quieres lograr?"), session.objective)
    await user.tab()
    await user.keyboard("{Enter}")

    expect(await screen.findByText("Antes de comenzar")).toBeInTheDocument()
  })

  test("recovers from a load failure by refreshing", async () => {
    const user = userEvent.setup()
    render(
      <RehearsalsPage
        initialSessions={[]}
        initialError="No pudimos cargar tus ensayos. Intenta de nuevo."
      />,
    )

    expect(screen.getByRole("alert")).toHaveTextContent(
      "No pudimos cargar tus ensayos",
    )
    await user.click(screen.getByRole("button", { name: "Reintentar" }))

    expect(refresh).toHaveBeenCalledOnce()
  })

  test("lists own rehearsals with their state", () => {
    const completed: RehearsalSession = {
      ...session,
      id: "session-2",
      situation: "Llamar al doctor para pedir una cita",
      status: "completed",
      updatedAt: "2026-09-22T09:00:00.000Z",
      feedback: {
        outcome: "achieved",
        explanation: "Lograste el objetivo.",
        corrections: [],
      },
    }
    render(<RehearsalsPage initialSessions={[session, completed]} />)

    expect(
      screen.getByRole("heading", { name: "Tus ensayos" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Listo para comenzar")).toBeInTheDocument()
    expect(screen.getByText("Objetivo logrado")).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: `Abrir ensayo: ${session.situation}` }),
    ).toHaveAttribute("href", "/rehearsals/session-1")
  })

  test("deletes a rehearsal after confirmation", async () => {
    fetchMock.mockResolvedValueOnce(response({ removed: true }))
    const user = userEvent.setup()
    render(<RehearsalsPage initialSessions={[session]} />)

    await user.click(
      screen.getByRole("button", {
        name: `Eliminar ensayo: ${session.situation}`,
      }),
    )
    expect(screen.getByText("¿Eliminar este ensayo?")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Eliminar" }))

    expect(
      await screen.findByText("Todavía no tienes ensayos"),
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith("/api/rehearsals/session-1", {
      method: "DELETE",
    })
  })

  test("cancels deletion without calling the API", async () => {
    const user = userEvent.setup()
    render(<RehearsalsPage initialSessions={[session]} />)

    await user.click(
      screen.getByRole("button", {
        name: `Eliminar ensayo: ${session.situation}`,
      }),
    )
    await user.click(screen.getByRole("button", { name: "Cancelar" }))

    expect(screen.queryByText("¿Eliminar este ensayo?")).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test("keeps the rehearsal and explains deletion errors", async () => {
    fetchMock.mockResolvedValueOnce(
      response(
        {
          error: {
            code: "internal-error",
            message: "No pudimos completar la solicitud. Intenta de nuevo.",
          },
        },
        500,
      ),
    )
    const user = userEvent.setup()
    render(<RehearsalsPage initialSessions={[session]} />)

    await user.click(
      screen.getByRole("button", {
        name: `Eliminar ensayo: ${session.situation}`,
      }),
    )
    await user.click(screen.getByRole("button", { name: "Eliminar" }))

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveAttribute("data-error-code", "internal-error")
    expect(
      screen.getByRole("link", { name: `Abrir ensayo: ${session.situation}` }),
    ).toBeInTheDocument()
  })
})
