import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseEnv } from "@/shared/lib/supabase/env"

function redirectWithCookies(
  request: NextRequest,
  destination: string,
  response: NextResponse,
) {
  const redirectResponse = NextResponse.redirect(
    new URL(destination, request.url),
  )

  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie)
  })

  return redirectResponse
}

export async function proxy(request: NextRequest) {
  const { url, anonKey } = getSupabaseEnv()
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })

        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options)
        })
      },
    },
  })

  const { data } = await supabase.auth.getClaims()
  const hasSession = Boolean(data?.claims)
  const isLogin = request.nextUrl.pathname === "/login"

  if (!hasSession && !isLogin) {
    return redirectWithCookies(request, "/login", supabaseResponse)
  }

  if (hasSession && isLogin) {
    return redirectWithCookies(request, "/", supabaseResponse)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|auth(?:/|$)|api(?:/|$)|assets(?:/|$)|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|webmanifest)$).*)",
  ],
}
