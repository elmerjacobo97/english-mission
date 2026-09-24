import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, test, vi } from "vitest"

import type { RehearsalMessage, RehearsalSession } from "../types"
import { RehearsalSessionPage } from "./rehearsal-session-page"

const fetchMock = vi.fn()
const push = vi.fn()

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))

function response(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response
}

function makeSession(overrides: Partial<RehearsalSession> = {}): RehearsalSession {
  return {
    id: "session-1",
    userId: "user-1",
    situation: "Pedir un café en una cafetería de Nueva York",
    objective: "Pedir una bebida y confirmar el precio",
    characterRole: "Barista de una cafetería",
    courseBand: "basic",
    status: "in_progress",
    messages: [
      { id: "m1", kind: "character_reply", content: "Hi! What can I get you?" },
    ],
    feedback: null,
    sourceSessionId: null,
    createdAt: "2026-09-23T10:00:00.000Z",
    updatedAt: "2026-09-23T10:00:00.000Z",
    ...overrides,
  }
}

function withReplies(count: number): RehearsalMessage[] {
  return [
    { id: "m1", kind: "character_reply", content: "Hi!" },
    ...Array.from({ length: count }, (_, index) => ({
      id: `u${index}`,
      kind: "user_reply" as const,
      content: `Reply ${index + 1}`,
    })),
  ]
}

beforeEach(() => {
  fetchMock.mockReset()
  push.mockReset()
  vi.stubGlobal("fetch", fetchMock)
})

describe("RehearsalSessionPage", () => {
  test.each(["ready", "in_progress", "completed"] as const)("links back to rehearsals from %s", (status) => {
    render(<RehearsalSessionPage initialSession={makeSession({ status })} />)

    expect(screen.getByRole("link", { name: "Volver a ensayos" })).toHaveAttribute(
      "href",
      "/rehearsals",
    )
  })

  test("starts a ready rehearsal and shows the conversation", async () => {
    fetchMock.mockResolvedValueOnce(
      response({
        session: makeSession({
          messages: [
            ...makeSession().messages,
            { id: "u1", kind: "user_reply", content: "Hi there!" },
            { id: "c1", kind: "character_reply", content: "Sure!" },
          ],
        }),
      }),
    )
    const user = userEvent.setup()
    render(<RehearsalSessionPage initialSession={makeSession({ status: "ready" })} />)

    expect(screen.getByText("Antes de comenzar")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Comenzar ensayo" }))

    expect(await screen.findByText("Respuesta 1 de 5")).toBeInTheDocument()
    expect(screen.getByText("Sure!")).toBeInTheDocument()
  })

  test("sends a reply and shows the character continuation", async () => {
    fetchMock.mockResolvedValueOnce(
      response({
        session: makeSession({
          messages: [
            ...makeSession().messages,
            { id: "u1", kind: "user_reply", content: "I'd like a coffee" },
            { id: "c1", kind: "character_reply", content: "Anything else?" },
          ],
        }),
      }),
    )
    const user = userEvent.setup()
    render(<RehearsalSessionPage initialSession={makeSession()} />)

    await user.type(
      screen.getByLabelText("Tu respuesta en inglés"),
      "I'd like a coffee",
    )
    await user.click(screen.getByRole("button", { name: "Enviar respuesta" }))

    expect(await screen.findByText("Anything else?")).toBeInTheDocument()
    expect(screen.getByText("Respuesta 1 de 5")).toBeInTheDocument()
    expect(screen.getByLabelText("Tu respuesta en inglés")).toHaveValue("")
  })

  test("clears the draft when the reply is saved but Coco fails", async () => {
    const pendingSession = makeSession({
      messages: [
        ...makeSession().messages,
        { id: "u1", kind: "user_reply", content: "Hello!" },
      ],
    })
    fetchMock
      .mockResolvedValueOnce(
        response(
          {
            error: {
              code: "ai-unavailable",
              message: "Coco no pudo responder. Intenta de nuevo.",
            },
            session: pendingSession,
          },
          503,
        ),
      )
      .mockResolvedValueOnce(
        response({
          session: makeSession({
            messages: [
              ...pendingSession.messages,
              { id: "c1", kind: "character_reply", content: "Sure!" },
            ],
          }),
        }),
      )
    const user = userEvent.setup()
    render(<RehearsalSessionPage initialSession={makeSession()} />)

    await user.type(screen.getByLabelText("Tu respuesta en inglés"), "Hello!")
    await user.click(screen.getByRole("button", { name: "Enviar respuesta" }))

    await user.click(await screen.findByRole("button", { name: "Reintentar" }))

    expect(await screen.findByText("Sure!")).toBeInTheDocument()
    expect(screen.getByText("Respuesta 1 de 5")).toBeInTheDocument()
    expect(screen.getByLabelText("Tu respuesta en inglés")).toHaveValue("")
  })

  test("keeps the draft when the reply was not saved", async () => {
    fetchMock.mockResolvedValueOnce(
      response(
        {
          error: { code: "not-found", message: "No encontramos este ensayo." },
        },
        404,
      ),
    )
    const user = userEvent.setup()
    render(<RehearsalSessionPage initialSession={makeSession()} />)

    await user.type(screen.getByLabelText("Tu respuesta en inglés"), "Hello!")
    await user.click(screen.getByRole("button", { name: "Enviar respuesta" }))

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveAttribute("data-error-code", "not-found")
    expect(screen.getByLabelText("Tu respuesta en inglés")).toHaveValue("Hello!")
  })

  test("offers a hint without consuming a turn", async () => {
    fetchMock.mockResolvedValueOnce(
      response({
        session: makeSession({
          messages: [
            ...makeSession().messages,
            {
              id: "h1",
              kind: "hint",
              content: "Puedes pedir una bebida.\nI'd like a coffee, please.",
            },
          ],
        }),
      }),
    )
    const user = userEvent.setup()
    render(<RehearsalSessionPage initialSession={makeSession()} />)

    await user.click(screen.getByRole("button", { name: "Dame una pista" }))

    expect(await screen.findByText("Pista")).toBeInTheDocument()
    expect(screen.getByText("Puedes pedir una bebida.")).toBeInTheDocument()
    expect(screen.getByText("I'd like a coffee, please.")).toBeInTheDocument()
    expect(screen.getByText("Respuesta 0 de 5")).toBeInTheDocument()
  })

  test("retries a pending generation without writing another reply", async () => {
    const pendingSession = makeSession({
      messages: [
        ...makeSession().messages,
        { id: "u1", kind: "user_reply", content: "Hello!" },
      ],
    })
    fetchMock.mockResolvedValueOnce(
      response({
        session: makeSession({
          messages: [
            ...pendingSession.messages,
            { id: "c1", kind: "character_reply", content: "Sure!" },
          ],
        }),
      }),
    )
    const user = userEvent.setup()
    render(<RehearsalSessionPage initialSession={pendingSession} />)

    expect(
      screen.getByText(/Coco todavía no respondió/),
    ).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Reintentar" }))

    expect(await screen.findByText("Sure!")).toBeInTheDocument()
    expect(fetchMock).toHaveBeenLastCalledWith("/api/rehearsals/session-1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "retry" }),
    })
  })

  test("shows feedback with corrections after finishing early", async () => {
    fetchMock.mockResolvedValueOnce(
      response({
        session: makeSession({
          status: "completed",
          messages: withReplies(2),
          feedback: {
            outcome: "partially_achieved",
            explanation: "Pediste la bebida, pero no confirmaste el precio.",
            corrections: [
              {
                original: "I want coffee",
                corrected: "I'd like a coffee",
                reason: "Suena más natural.",
              },
            ],
          },
        }),
      }),
    )
    const user = userEvent.setup()
    render(<RehearsalSessionPage initialSession={makeSession({ messages: withReplies(2) })} />)

    await user.click(screen.getByRole("button", { name: "Terminar ensayo" }))

    expect(await screen.findByText("Parcialmente logrado")).toBeInTheDocument()
    expect(
      screen.getByText("Pediste la bebida, pero no confirmaste el precio."),
    ).toBeInTheDocument()
    expect(screen.getByText("I'd like a coffee")).toBeInTheDocument()
    expect(screen.getByText("Suena más natural.")).toBeInTheDocument()
    expect(screen.getByText("Conversación")).toBeInTheDocument()
  })

  test("tells when there is not enough evidence to evaluate", () => {
    render(
      <RehearsalSessionPage
        initialSession={makeSession({
          status: "completed",
          messages: makeSession().messages,
          feedback: {
            outcome: "insufficient_evidence",
            explanation:
              "Todavía no hay respuestas suficientes para evaluar el ensayo.",
            corrections: [],
          },
        })}
      />,
    )

    expect(screen.getByText("Evidencia insuficiente")).toBeInTheDocument()
    expect(
      screen.getByText(/no hay respuestas suficientes/),
    ).toBeInTheDocument()
  })

  test("warns before the fifth reply is the last turn", () => {
    render(
      <RehearsalSessionPage
        initialSession={makeSession({
          messages: [
            ...withReplies(4),
            { id: "c2", kind: "character_reply", content: "What else?" },
          ],
        })}
      />,
    )

    expect(screen.getByText("Respuesta 4 de 5")).toBeInTheDocument()
    expect(
      screen.getByText(/al enviarla, Coco evaluará tu ensayo/),
    ).toBeInTheDocument()
  })

  test("repeats with a variation from the feedback", async () => {
    fetchMock.mockResolvedValueOnce(
      response(
        {
          session: makeSession({
            id: "session-2",
            status: "ready",
            sourceSessionId: "session-1",
          }),
        },
        201,
      ),
    )
    const user = userEvent.setup()
    render(
      <RehearsalSessionPage
        initialSession={makeSession({
          status: "completed",
          messages: withReplies(2),
          feedback: {
            outcome: "achieved",
            explanation: "Lograste el objetivo.",
            corrections: [],
          },
        })}
      />,
    )

    await user.click(
      screen.getByRole("button", { name: "Repetir con una variación" }),
    )

    expect(fetchMock).toHaveBeenLastCalledWith("/api/rehearsals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sourceSessionId: "session-1" }),
    })
    expect(push).toHaveBeenCalledWith("/rehearsals/session-2")
  })

  test("keeps the feedback and explains repeat errors", async () => {
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
    render(
      <RehearsalSessionPage
        initialSession={makeSession({
          status: "completed",
          messages: withReplies(2),
          feedback: {
            outcome: "achieved",
            explanation: "Lograste el objetivo.",
            corrections: [],
          },
        })}
      />,
    )

    await user.click(
      screen.getByRole("button", { name: "Repetir con una variación" }),
    )

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveAttribute("data-error-code", "daily-limit")
    expect(screen.getByText("Objetivo logrado")).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  test("keeps the conversation and explains the daily limit", async () => {
    fetchMock.mockResolvedValueOnce(
      response(
        {
          error: {
            code: "daily-limit",
            message:
              "Alcanzaste el límite diario de 50 generaciones. Podrás continuar después del reinicio diario (UTC).",
          },
          session: makeSession({
            messages: [
              ...makeSession().messages,
              { id: "u1", kind: "user_reply", content: "Hello!" },
            ],
          }),
        },
        429,
      ),
    )
    const user = userEvent.setup()
    render(<RehearsalSessionPage initialSession={makeSession()} />)

    await user.type(screen.getByLabelText("Tu respuesta en inglés"), "Hello!")
    await user.click(screen.getByRole("button", { name: "Enviar respuesta" }))

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveAttribute("data-error-code", "daily-limit")
    expect(alert).toHaveTextContent("reinicio diario (UTC)")
    expect(screen.getByText("Hello!")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument()
  })
})
