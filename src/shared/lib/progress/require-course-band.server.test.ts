import { beforeEach, describe, expect, test, vi } from "vitest"
import { emptyProgress } from "./progress-mappers"
import { requireCourseBand } from "./require-course-band.server"

vi.mock("server-only", () => ({}))

const auth = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}))
const repository = vi.hoisted(() => ({
  readProgress: vi.fn(),
}))
const navigation = vi.hoisted(() => ({
  redirect: vi.fn((path: string): never => {
    throw new Error(`redirect:${path}`)
  }),
}))

vi.mock("../supabase/server", () => auth)
vi.mock("./progress-repository.server", () => repository)
vi.mock("next/navigation", () => navigation)

describe("requireCourseBand", () => {
  beforeEach(() => {
    auth.getCurrentUser.mockReset()
    repository.readProgress.mockReset()
    navigation.redirect.mockClear()
  })

  test("redirects unauthenticated users to login", async () => {
    auth.getCurrentUser.mockResolvedValue(null)

    await expect(requireCourseBand()).rejects.toThrow("redirect:/login")
    expect(repository.readProgress).not.toHaveBeenCalled()
  })

  test("redirects users without a selected route to onboarding", async () => {
    const user = { id: "user-1" }
    auth.getCurrentUser.mockResolvedValue(user)
    repository.readProgress.mockResolvedValue(emptyProgress)

    await expect(requireCourseBand()).rejects.toThrow("redirect:/onboarding")
    expect(repository.readProgress).toHaveBeenCalledWith(user.id)
  })

  test("returns authenticated users with a selected route", async () => {
    const user = { id: "user-1" }
    const progress = { ...emptyProgress, courseBand: "intermediate" as const }
    auth.getCurrentUser.mockResolvedValue(user)
    repository.readProgress.mockResolvedValue(progress)

    await expect(requireCourseBand()).resolves.toEqual({ user, progress })
    expect(navigation.redirect).not.toHaveBeenCalled()
  })
})
