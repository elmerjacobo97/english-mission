import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, test, vi } from "vitest"
import type { VideoLibraryItem } from "../utils/video"
import { VideosPage } from "./videos-page"

vi.mock("./video-session-view", () => ({
  VideoSessionView: ({ video }: { video: VideoLibraryItem }) => (
    <div data-testid="video-session">Sesión: {video.title}</div>
  ),
}))

const video: VideoLibraryItem = {
  videoId: "dQw4w9WgXcQ",
  url: "https://youtu.be/dQw4w9WgXcQ",
  title: "A video",
  thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  language: "en",
  segments: [{ text: "Hello", startMs: 0, durationMs: 1000 }],
  positionMs: 0,
  createdAt: "2026-09-22T00:00:00.000Z",
  updatedAt: "2026-09-22T00:00:00.000Z",
}

const fetchMock = vi.fn()

function response(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
})

describe("VideosPage", () => {
  test("shows URL validation without calling process API", async () => {
    const user = userEvent.setup()
    render(<VideosPage initialVideos={[]} />)

    await user.type(screen.getByLabelText("URL de YouTube"), "not valid")
    await user.click(screen.getByRole("button", { name: "Procesar video" }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Pega una URL válida de YouTube.",
    )
  })

  test("processes video and opens its session", async () => {
    fetchMock.mockResolvedValueOnce(response({ video, reused: false }, 201))
    const user = userEvent.setup()
    render(<VideosPage initialVideos={[]} />)

    await user.type(screen.getByLabelText("URL de YouTube"), video.url)
    await user.click(screen.getByRole("button", { name: "Procesar video" }))

    expect(await screen.findByTestId("video-session")).toHaveTextContent(
      "Sesión: A video",
    )
    expect(screen.getByRole("status")).toHaveTextContent(
      "Video guardado",
    )
  })

  test("explains unavailable transcript from API", async () => {
    fetchMock.mockResolvedValueOnce(
      response(
        {
          error: {
            code: "transcript-unavailable",
            message: "No encontramos un transcript disponible para este video.",
          },
        },
        422,
      ),
    )
    const user = userEvent.setup()
    render(<VideosPage initialVideos={[]} />)

    await user.type(screen.getByLabelText("URL de YouTube"), video.url)
    await user.click(screen.getByRole("button", { name: "Procesar video" }))

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveAttribute("data-error-code", "transcript-unavailable")
    expect(alert).toHaveTextContent("Prueba otro video")
  })

  test("opens saved video and confirms deletion", async () => {
    fetchMock.mockResolvedValueOnce(response({ video }))
    const user = userEvent.setup()
    render(<VideosPage initialVideos={[video]} />)

    await user.click(screen.getByRole("button", { name: "Abrir A video" }))
    expect(screen.getByTestId("video-session")).toHaveTextContent("A video")

    await user.click(screen.getByRole("button", { name: "Eliminar A video" }))
    await user.click(screen.getByRole("button", { name: /^Eliminar$/ }))

    expect(await screen.findByText("Todavía no guardas videos")).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/videos/${video.videoId}`,
      { method: "DELETE" },
    )
  })

  test("explains full library limit", () => {
    const videos = Array.from({ length: 20 }, (_, index) => ({
      ...video,
      videoId: `${index.toString().padStart(10, "0")}a`,
      title: `Video ${index + 1}`,
    }))
    render(<VideosPage initialVideos={videos} />)

    expect(screen.getByText(/Biblioteca llena/)).toBeInTheDocument()
    expect(screen.getByText("20/20")).toBeInTheDocument()
  })
})
