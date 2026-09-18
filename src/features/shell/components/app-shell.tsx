"use client"

import type { Icon } from "@phosphor-icons/react"
import {
  ArrowCounterClockwise,
  BookOpenText,
  Coins,
  Fire,
  MapTrifold,
  Storefront,
} from "@phosphor-icons/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { useDueReviews } from "@/features/review/hooks/use-due-reviews"
import { useProgress } from "@/lib/progress/use-progress"

type ShellNavItem = {
  href: string
  label: string
  icon: Icon
}

const NAV_ITEMS: ShellNavItem[] = [
  { href: "/", label: "Mapa", icon: MapTrifold },
  { href: "/notebook", label: "Cuaderno", icon: BookOpenText },
  { href: "/review", label: "Repaso", icon: ArrowCounterClockwise },
  { href: "/shop", label: "Tienda", icon: Storefront },
]

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/"
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const dueCount = useDueReviews()
  const { progress } = useProgress()
  const { streak } = progress

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col md:grid md:grid-cols-[16rem_minmax(0,1fr)] md:border-x-2 md:border-ink/10">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b-2 border-ink/10 bg-paper/95 px-4 py-3 backdrop-blur md:col-start-2 md:row-start-1 md:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-lg font-bold"
        >
          <MapTrifold
            weight="fill"
            size={24}
            className="text-accent-strong"
            aria-hidden
          />
          English Mission
        </Link>
        <div className="flex items-center gap-2">
          <span
            key={`coins-${progress.coins}`}
            aria-label={`Monedas: ${progress.coins}`}
            className="animate-pop flex items-center gap-1.5 rounded-full border-2 border-ink/10 bg-surface px-3 py-2 font-display text-sm font-semibold shadow-card"
          >
            <Coins
              weight="duotone"
              size={18}
              className="text-accent-strong"
              aria-hidden
            />
            {progress.coins}
          </span>
          <span
            key={`streak-${streak.current}`}
            className="animate-pop flex items-center gap-1.5 rounded-full border-2 border-ink/10 bg-surface px-3 py-2 font-display text-sm font-semibold shadow-card"
            aria-label={`Racha de ${streak.current} días. Récord: ${streak.best} días`}
            title={`Récord: ${streak.best} días`}
          >
            <Fire
              weight="duotone"
              size={18}
              className={streak.current > 0 ? "text-error" : "text-ink/30"}
              aria-hidden
            />
            {streak.current}
          </span>
        </div>
      </header>

      <nav
        aria-label="Navegación"
        className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink/10 bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:sticky md:top-0 md:col-start-1 md:row-span-2 md:row-start-1 md:h-dvh md:border-t-0 md:border-r-2 md:py-6"
      >
        <p className="hidden px-4 pb-2 font-display text-xs font-semibold uppercase tracking-widest text-muted md:block">
          Navegación
        </p>
        <ul className="flex md:flex-col md:gap-1.5 md:px-3">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href)
            const ItemIcon = item.icon
            return (
              <li key={item.href} className="flex flex-1 md:flex-none">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 font-display text-xs font-semibold transition md:flex-row md:gap-3 md:rounded-2xl md:px-3 md:py-2.5 md:text-base ${
                    active
                      ? "text-accent-strong md:bg-surface md:text-ink md:shadow-card"
                      : "text-muted hover:text-ink md:hover:bg-surface/70"
                  }`}
                >
                  <ItemIcon
                    weight={active ? "fill" : "regular"}
                    size={22}
                    aria-hidden
                  />
                  {item.label}
                  {item.href === "/review" && dueCount > 0 && (
                    <span className="absolute top-1.5 right-3 rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-bold text-ink md:static md:ml-auto">
                      {dueCount}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="flex-1 px-4 pt-6 pb-28 md:col-start-2 md:row-start-2 md:px-8 md:pt-8 md:pb-12">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          {children}
        </div>
      </div>
    </div>
  )
}
