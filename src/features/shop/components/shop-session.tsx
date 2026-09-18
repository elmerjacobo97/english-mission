"use client"

import { ArrowLeft, Coins, Storefront } from "@phosphor-icons/react"
import Link from "next/link"
import { ChoiceChallenge } from "@/features/mission/components/choice-challenge"
import { MAX_DAILY_RECHARGES } from "@/lib/progress/shop"
import { useShopRun } from "../hooks/use-shop-run"
import { SHOP_PROFILE } from "../utils/shop-exercise"

function BackLink() {
  return (
    <Link
      href="/"
      aria-label="Volver al mapa"
      className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink/10 bg-surface shadow-card"
    >
      <ArrowLeft weight="bold" size={20} aria-hidden />
    </Link>
  )
}

export function ShopSession() {
  const run = useShopRun()

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-5">
      <header className="flex items-center gap-3">
        <BackLink />
        <h1 className="font-display text-xl font-bold">Tienda de monedas</h1>
      </header>

      {!run.hasWords ? (
        <section className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-ink/15 bg-white/60 p-6 text-center">
          <span className="text-4xl" aria-hidden>
            🏪
          </span>
          <p className="font-display font-semibold">
            Completa una misión para desbloquear la tienda
          </p>
          <Link
            href="/"
            className="flex min-h-12 items-center rounded-2xl bg-accent-strong px-5 font-display font-semibold text-white shadow-pop transition active:translate-y-0.5"
          >
            Volver al mapa
          </Link>
        </section>
      ) : run.phase === "playing" && run.challenge ? (
        <ChoiceChallenge
          beat={run.challenge}
          coins={0}
          rewardsEnabled={false}
          freeHints
          profile={SHOP_PROFILE}
          onSpendCoins={() => false}
          onSolved={run.answer}
          onContinue={() => undefined}
        />
      ) : run.phase === "result" ? (
        <section className="flex flex-col items-center gap-4 rounded-3xl border-2 border-ink/10 bg-surface p-6 text-center shadow-card">
          <span className="text-4xl" aria-hidden>
            🪙
          </span>
          <p className="font-display text-lg font-bold">
            {run.payout > 0
              ? `¡Ganaste ${run.payout} monedas!`
              : "Esta vez no ganaste monedas"}
          </p>
          <p className="font-semibold text-muted">{`Saldo actual: ${run.coins} monedas`}</p>
          {run.payout === 0 && (
            <p className="text-sm font-semibold text-muted">
              No se descontó cupo. Puedes reintentar.
            </p>
          )}
          <div className="flex w-full flex-col gap-2">
            {run.quotaLeft ? (
              <button
                type="button"
                onClick={run.start}
                className="flex min-h-12 items-center justify-center rounded-2xl bg-accent-strong px-5 font-display font-semibold text-white shadow-pop transition active:translate-y-0.5"
              >
                Recargar otra vez
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="flex min-h-12 items-center justify-center rounded-2xl bg-accent-strong px-5 font-display font-semibold text-white shadow-pop disabled:opacity-40"
              >
                Vuelve mañana
              </button>
            )}
            <Link
              href="/"
              className="flex min-h-12 items-center justify-center rounded-2xl border-2 border-ink/10 bg-surface px-5 font-display font-semibold text-muted shadow-card transition hover:text-ink"
            >
              Volver al mapa
            </Link>
          </div>
        </section>
      ) : (
        <section className="flex flex-col gap-4 rounded-3xl border-2 border-ink/10 bg-surface p-6 shadow-card">
          <div className="flex items-center gap-3">
            <Storefront
              weight="fill"
              size={28}
              className="text-accent-strong"
              aria-hidden
            />
            <p className="font-display text-lg font-bold">{`Tu saldo: ${run.coins} monedas`}</p>
          </div>
          <p className="flex items-center gap-2 font-semibold text-muted">
            <Coins weight="fill" size={18} aria-hidden />
            {`Recargas hoy: ${run.usedToday}/${MAX_DAILY_RECHARGES}`}
          </p>
          <p className="text-sm font-semibold text-muted">
            Resuelve una palabra que ya viste. Ganas 10 monedas al primer
            intento y 5 si fallas o usas la pista gratis.
          </p>
          <button
            type="button"
            onClick={run.start}
            disabled={!run.quotaLeft}
            className="flex min-h-12 items-center justify-center rounded-2xl bg-accent-strong px-5 font-display font-semibold text-white shadow-pop transition active:translate-y-0.5 disabled:opacity-40"
          >
            {run.quotaLeft ? "Ganar monedas" : "Vuelve mañana"}
          </button>
        </section>
      )}
    </main>
  )
}
