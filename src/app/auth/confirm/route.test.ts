import { NextRequest } from "next/server"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { GET } from "./route"

const auth = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  exchangeCodeForSession: vi.fn(),
}))

vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServerClient: auth.createSupabaseServerClient,
}))

function request(query = "") {
  return new NextRequest(`http://localhost:3000/auth/confirm${query}`)
}

function location(response: Response) {
  return response.headers.get("location")
}

describe("/auth/confirm", () => {
  beforeEach(() => {
    auth.exchangeCodeForSession.mockReset()
    auth.createSupabaseServerClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: auth.exchangeCodeForSession,
      },
    })
    auth.exchangeCodeForSession.mockResolvedValue({ error: null })
  })

  test("exchanges a valid code and redirects to the internal next path", async () => {
    const response = await GET(request("?code=valid&next=%2Fnotebook"))

    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("valid")
    expect(location(response)).toBe("http://localhost:3000/notebook")
  })

  test("redirects to login when code is missing", async () => {
    const response = await GET(request())

    expect(location(response)).toBe(
      "http://localhost:3000/login?error=missing_code",
    )
  })

  test("redirects to login when code exchange fails", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({
      error: new Error("invalid code"),
    })

    const response = await GET(request("?code=invalid"))

    expect(location(response)).toBe(
      "http://localhost:3000/login?error=auth_callback",
    )
  })

  test("ignores an external next URL", async () => {
    const response = await GET(
      request("?code=valid&next=https%3A%2F%2Fevil.example"),
    )

    expect(location(response)).toBe("http://localhost:3000/")
  })
})
