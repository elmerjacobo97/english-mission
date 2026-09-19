import { NextResponse, type NextRequest } from "next/server"
import { createSupabaseServerClient } from "@/shared/lib/supabase/server"

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/"
  }

  return value
}

function loginError(request: NextRequest, reason: string) {
  const url = new URL("/login", request.url)
  url.searchParams.set("error", reason)
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  if (!code) {
    return loginError(request, "missing_code")
  }

  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return loginError(request, "auth_callback")
    }

    return NextResponse.redirect(
      new URL(safeNext(request.nextUrl.searchParams.get("next")), request.url),
    )
  } catch {
    return loginError(request, "auth_callback")
  }
}
