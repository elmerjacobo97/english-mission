"use client"

import { Coins, Storefront } from "@phosphor-icons/react"
import Link from "next/link"
import { CharacterAvatar } from "@/components/game/character-avatar"
import { ChoiceChallenge } from "@/components/game/choice-challenge"
import { PageHeader } from "@/components/page-header"
import { MAX_DAILY_RECHARGES } from "@/lib/progress/shop"
import { useProgress } from "@/lib/progress/use-progress"
import { COCO_LOOKS } from "@/lib/game/content/coco-looks"
import { useShopRun } from "../hooks/use-shop-run"
import { SHOP_PROFILE } from "../utils/shop-exercise"

export function ShopSession() {
  const run = useShopRun()
  const { progress, selectLook } = useProgress()

  return (
    <main className="flex flex-1 flex-col gap-6">
      <PageHeader
        icon={Storefront}
        title="Tienda"
        description="Resuelve una palabra que ya viste para ganar monedas y gástalas en looks para Coco."
      />

      {!run.hasWords ? (
        <section className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-ink/15 bg-white/60 p-6 text-center">
          <span className="text-4xl" aria-hidden>
            🏪
          </span>
          <p className="font-display font-semibold">
            Completa una misión para desbloquear la recarga
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
          <p className="font-display text-lg font-bold">{`Tu saldo: ${run.coins} monedas`}</p>
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

      {run.phase !== "playing" && (
        <section className="flex flex-col gap-4 rounded-3xl border-2 border-ink/10 bg-surface p-6 shadow-card">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-lg font-bold">Looks de Coco</h2>
            <p className="text-sm font-semibold text-muted">
              Compra un look y queda equipado al instante. Cambiar entre looks
              que ya tienes es gratis.
            </p>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {COCO_LOOKS.map((look) => {
              const owned =
                look.id === "classic" || progress.looks.owned.includes(look.id)
              const equipped = progress.looks.equipped === look.id
              const canAfford = progress.coins >= look.price
              let label = `Comprar · ${look.price}`
              let ariaLabel = `Comprar ${look.name} · ${look.price}`
              if (owned) {
                label = "Usar"
                ariaLabel = `Usar ${look.name}`
              }
              if (equipped) {
                label = "Equipado"
                ariaLabel = "Equipado"
              }
              return (
                <li
                  key={look.id}
                  className="flex flex-col items-center gap-2 rounded-2xl border-2 border-ink/10 bg-white/60 p-3 text-center"
                >
                  <CharacterAvatar
                    character="coco"
                    lookId={look.id}
                    size={72}
                  />
                  <p className="font-display font-semibold">{look.name}</p>
                  <p className="text-sm font-semibold text-muted">
                    {look.price === 0 ? "Gratis" : `${look.price} monedas`}
                  </p>
                  <button
                    type="button"
                    onClick={() => selectLook(look.id)}
                    disabled={equipped || (!owned && !canAfford)}
                    aria-label={ariaLabel}
                    className="flex min-h-10 w-full items-center justify-center rounded-xl bg-accent-strong px-3 font-display text-sm font-semibold text-white shadow-pop transition active:translate-y-0.5 disabled:opacity-40"
                  >
                    {label}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </main>
  )
}
