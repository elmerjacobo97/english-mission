import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, test, vi } from "vitest"
import * as progressSync from "@/shared/lib/progress/progress-sync"
import { SyncBanner } from "./sync-banner"

const getSyncSnapshot = vi.spyOn(progressSync, "getSyncSnapshot")
const retry = vi.spyOn(progressSync, "retry")

beforeEach(() => {
  getSyncSnapshot.mockReset()
  retry.mockReset()
})

describe("SyncBanner", () => {
  test("stays hidden while sync is idle", () => {
    getSyncSnapshot.mockReturnValue({ state: "idle", pending: 0 })

    render(<SyncBanner />)

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  test("shows error and retries pending work", async () => {
    const user = userEvent.setup()
    getSyncSnapshot.mockReturnValue({ state: "error", pending: 1 })
    retry.mockResolvedValue()

    render(<SyncBanner />)

    expect(screen.getByRole("alert")).toHaveTextContent(
      "No pudimos guardar tu progreso.",
    )
    await user.click(screen.getByRole("button", { name: "Reintentar" }))

    expect(retry).toHaveBeenCalledOnce()
  })
})
