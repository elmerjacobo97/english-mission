"use client"

import { GearSixIcon, SignOutIcon, UserCircleIcon } from "@phosphor-icons/react"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signOut } from "../services/auth.service"

export function UserMenu({ email }: { email: string }) {
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

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
    <div ref={menuRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? "Cerrar menú de usuario" : "Abrir menú de usuario"}
        aria-expanded={open}
        aria-controls="user-menu"
        className="ui-icon-button text-teal-strong hover:-translate-y-0.5 hover:border-teal/30"
      >
        <UserCircleIcon weight={open ? "fill" : "duotone"} size={27} aria-hidden />
      </button>
      {open && (
        <div
          id="user-menu"
          className="ui-card-compact absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-1.5rem)] p-2"
        >
          <p className="px-2 pt-1 font-display text-xs font-semibold uppercase tracking-wide text-muted">
            Cuenta
          </p>
          <p className="truncate px-2 pb-2 text-sm font-semibold text-ink" title={email}>
            {email}
          </p>
          <div className="border-t-2 border-ink/10 pt-2">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
            className="flex min-h-11 w-full items-center gap-2 rounded-xl px-2.5 font-display text-sm font-semibold transition hover:bg-paper focus-visible:bg-paper"
            >
              <GearSixIcon weight="bold" size={18} aria-hidden />
              Configuración
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={pending}
              className="flex min-h-11 w-full items-center gap-2 rounded-xl px-2.5 font-display text-sm font-semibold transition hover:bg-paper focus-visible:bg-paper disabled:cursor-wait disabled:opacity-60"
            >
              <SignOutIcon weight="bold" size={18} aria-hidden />
              {pending ? "Saliendo..." : "Salir"}
            </button>
          </div>
          {error && (
            <span role="alert" className="block px-2 pb-1 pt-2 text-xs font-semibold text-error">
              No pudimos cerrar sesión. Intenta de nuevo.
            </span>
          )}
        </div>
      )}
    </div>
  )
}
