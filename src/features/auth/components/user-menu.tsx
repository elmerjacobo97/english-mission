"use client"

import { SignOut, UserCircle } from "@phosphor-icons/react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "../services/auth.service"

export function UserMenu({ email }: { email: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)

  async function handleSignOut() {
    setPending(true)
    setError(false)

    try {
      const { error: signOutError } = await signOut()
      if (signOutError) {
        setError(true)
        setPending(false)
        return
      }

      router.push("/login")
      router.refresh()
    } catch {
      setError(true)
      setPending(false)
    }
  }

  return (
    <div className="flex max-w-[min(48vw,16rem)] items-center gap-2">
      <UserCircle
        weight="duotone"
        size={20}
        className="hidden shrink-0 text-teal-strong sm:block"
        aria-hidden
      />
      <span className="min-w-0 truncate text-xs font-semibold text-muted" title={email}>
        {email}
      </span>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={pending}
        className="flex min-h-10 shrink-0 items-center gap-1 rounded-xl border-2 border-ink/10 bg-surface px-2.5 font-display text-xs font-semibold shadow-card transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
      >
        <SignOut weight="bold" size={16} aria-hidden />
        {pending ? "Saliendo..." : "Salir"}
      </button>
      {error && (
        <span role="alert" className="sr-only">
          No pudimos cerrar sesión. Intenta de nuevo.
        </span>
      )}
    </div>
  )
}
