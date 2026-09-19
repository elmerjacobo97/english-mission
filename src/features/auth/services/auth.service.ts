import { createSupabaseBrowserClient } from "@/shared/lib/supabase/browser"

export function signInWithMagicLink(email: string) {
  return createSupabaseBrowserClient().auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/confirm?next=/`,
    },
  })
}

export function signOut() {
  return createSupabaseBrowserClient().auth.signOut()
}
