import { Compass } from "@phosphor-icons/react/dist/ssr"
import Link from "next/link"

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 px-4 py-8 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-ink/10 bg-teal-soft text-teal-strong shadow-card">
        <Compass weight="fill" size={40} aria-hidden />
      </span>
      <h1 className="font-display text-2xl font-bold">
        Esa misión no existe
      </h1>
      <p className="font-semibold text-muted">
        Puede que el enlace esté roto o que la misión todavía no esté escrita.
      </p>
      <Link
        href="/"
        className="flex min-h-12 items-center rounded-2xl bg-accent-strong px-5 font-display font-semibold text-white shadow-pop transition active:translate-y-0.5"
      >
        Volver al mapa
      </Link>
    </main>
  )
}
