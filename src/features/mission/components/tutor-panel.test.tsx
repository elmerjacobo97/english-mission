import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { TutorPanel } from "./tutor-panel"

const reply = {
  explanation: "**Usamos be** para describir estados.",
  correction: {
    original: "I have tired.",
    corrected: "I am tired.",
    reason: "Tired describe un estado.",
  },
  example: { english: "I am ready.", spanish: "Estoy listo." },
  curiosity: "**Be** cambia según la persona.",
}

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal("fetch", vi.fn())
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  localStorage.clear()
})

const userId = "account-1"

describe("TutorPanel", () => {
  test("sends question and shows structured correction and example", async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(jsonResponse({ reply }))
    const user = userEvent.setup()
    render(<TutorPanel beatIndex={0} userId={userId} missionSlug="arrival" onClose={vi.fn()} />)

    await user.type(
      screen.getByRole("textbox", { name: "Tu pregunta para Coco" }),
      "Can you correct my sentence?",
    )
    await user.click(screen.getByRole("button", { name: "Preguntar" }))

    expect(await screen.findByText("Usamos be", { selector: "strong" })).toBeInTheDocument()
    expect(screen.getByText("Be", { selector: "strong" })).toBeInTheDocument()
    expect(screen.getByText(reply.correction.corrected)).toBeInTheDocument()
    expect(screen.getByText(reply.example.english)).toBeInTheDocument()
    expect(screen.getByText(reply.example.spanish)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tutor",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          message: "Can you correct my sentence?",
          history: [],
          missionSlug: "arrival",
          beatIndex: 0,
        }),
      }),
    )
  })

  test("retries provider failure without duplicating the question", async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ error: { code: "ai-unavailable" } }, 503),
      )
      .mockResolvedValueOnce(jsonResponse({ reply }))
    const user = userEvent.setup()
    render(<TutorPanel beatIndex={0} userId={userId} missionSlug="arrival" onClose={vi.fn()} />)

    await user.type(
      screen.getByRole("textbox", { name: "Tu pregunta para Coco" }),
      "What does tired mean?",
    )
    await user.click(screen.getByRole("button", { name: "Preguntar" }))
    await screen.findByRole("alert")
    await user.click(screen.getByRole("button", { name: "Reintentar" }))

    expect(await screen.findByText("Usamos be", { selector: "strong" })).toBeInTheDocument()
    expect(screen.getAllByText("What does tired mean?")).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string)).toEqual(
      JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string),
    )
  })

  test("shows Coco's animated thinking card while waiting for reply", async () => {
    const pending = deferred<Response>()
    vi.mocked(fetch).mockReturnValueOnce(pending.promise)
    const user = userEvent.setup()
    render(<TutorPanel beatIndex={0} userId={userId} missionSlug="arrival" onClose={vi.fn()} />)

    await user.type(
      screen.getByRole("textbox", { name: "Tu pregunta para Coco" }),
      "Why does this sentence use be?",
    )
    await user.click(screen.getByRole("button", { name: "Preguntar" }))

    const status = screen.getByRole("status")
    expect(status).toHaveTextContent("Coco está pensando")
    expect(status).toHaveTextContent("Busca una explicación clara para ti")
    expect(status).toHaveClass("motion-safe:animate-in", "motion-safe:slide-in-from-bottom-2")
    expect(
      status.querySelectorAll('[aria-hidden="true"] [class~="motion-safe:animate-pulse"]'),
    ).toHaveLength(3)

    await act(async () => pending.resolve(jsonResponse({ reply })))

    expect(await screen.findByText("Usamos be", { selector: "strong" })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument())
  })

  test("shows exhausted quota and disables questions", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ error: { code: "daily-limit" } }, 429),
    )
    const user = userEvent.setup()
    render(<TutorPanel beatIndex={0} userId={userId} missionSlug="arrival" onClose={vi.fn()} />)

    await user.type(
      screen.getByRole("textbox", { name: "Tu pregunta para Coco" }),
      "Why?",
    )
    await user.click(screen.getByRole("button", { name: "Preguntar" }))

    expect(await screen.findByText("Límite diario alcanzado · 50 de 50")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument()
    expect(screen.queryByRole("textbox", { name: "Tu pregunta para Coco" })).not.toBeInTheDocument()
  })

  test("closes on request", async () => {
    const onClose = vi.fn()
    render(<TutorPanel beatIndex={0} userId={userId} missionSlug="arrival" onClose={onClose} />)

    const dialog = screen.getByRole("dialog", { name: "Pregúntale a Coco" })
    expect(dialog).toHaveAttribute("aria-modal", "true")
    expect(dialog).toHaveClass(
      "motion-safe:animate-in",
      "motion-safe:slide-in-from-bottom-4",
      "sm:motion-safe:slide-in-from-right-4",
    )
    await userEvent.setup().click(screen.getByRole("button", { name: "Cerrar tutor" }))

    expect(onClose).toHaveBeenCalledOnce()
  })

  test.each(["escape", "backdrop"])("closes sheet via %s", async (method) => {
    const onClose = vi.fn()
    render(<TutorPanel beatIndex={0} userId={userId} missionSlug="arrival" onClose={onClose} />)
    const dialog = screen.getByRole("dialog", { name: "Pregúntale a Coco" })

    if (method === "escape") {
      fireEvent(dialog, new Event("cancel", { cancelable: true }))
    } else {
      fireEvent.click(dialog)
    }

    expect(onClose).toHaveBeenCalledOnce()
  })

  test("restores messages after panel remount and isolates histories by account and mission", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ reply }))
    const user = userEvent.setup()
    const first = render(
      <TutorPanel beatIndex={0} userId={userId} missionSlug="arrival" onClose={vi.fn()} />,
    )
    await user.type(screen.getByRole("textbox", { name: "Tu pregunta para Coco" }), "Keep this")
    await user.click(screen.getByRole("button", { name: "Preguntar" }))
    expect(await screen.findByText("Keep this")).toBeInTheDocument()
    first.unmount()

    const otherAccount = render(
      <TutorPanel beatIndex={0} userId="account-2" missionSlug="arrival" onClose={vi.fn()} />,
    )
    expect(screen.queryByText("Keep this")).not.toBeInTheDocument()
    otherAccount.unmount()

    const otherMission = render(
      <TutorPanel beatIndex={0} userId={userId} missionSlug="bus" onClose={vi.fn()} />,
    )
    expect(screen.queryByText("Keep this")).not.toBeInTheDocument()
    otherMission.unmount()

    render(<TutorPanel beatIndex={0} userId={userId} missionSlug="arrival" onClose={vi.fn()} />)
    expect(await screen.findByText("Keep this")).toBeInTheDocument()
    expect(screen.getByText(reply.example.english)).toBeInTheDocument()
  })

  test("clears every history for current account only", async () => {
    localStorage.setItem(
      `english-mission:coco-tutor:v1:${userId}:arrival`,
      JSON.stringify({ messages: [{ role: "user", content: "Arrival history" }] }),
    )
    localStorage.setItem(
      `english-mission:coco-tutor:v1:${userId}:bus`,
      JSON.stringify({ messages: [{ role: "user", content: "Bus history" }] }),
    )
    localStorage.setItem(
      "english-mission:coco-tutor:v1:account-2:arrival",
      JSON.stringify({ messages: [{ role: "user", content: "Other account" }] }),
    )
    render(<TutorPanel beatIndex={0} userId={userId} missionSlug="arrival" onClose={vi.fn()} />)

    expect(await screen.findByText("Arrival history")).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole("button", { name: "Limpiar historial" }))

    expect(screen.queryByText("Arrival history")).not.toBeInTheDocument()
    expect(localStorage.getItem(`english-mission:coco-tutor:v1:${userId}:arrival`)).toBeNull()
    expect(localStorage.getItem(`english-mission:coco-tutor:v1:${userId}:bus`)).toBeNull()
    expect(localStorage.getItem("english-mission:coco-tutor:v1:account-2:arrival")).not.toBeNull()
  })

  test("keeps conversation usable when localStorage writes fail", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage unavailable", "QuotaExceededError")
    })
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ reply }))
    const user = userEvent.setup()
    render(<TutorPanel beatIndex={0} userId={userId} missionSlug="arrival" onClose={vi.fn()} />)

    await user.type(screen.getByRole("textbox", { name: "Tu pregunta para Coco" }), "Still works")
    await user.click(screen.getByRole("button", { name: "Preguntar" }))

    expect(await screen.findByText("Still works")).toBeInTheDocument()
    expect(screen.getByText(reply.example.english)).toBeInTheDocument()
  })
})
