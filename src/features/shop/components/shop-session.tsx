"use client"

import { CoinsIcon, StorefrontIcon } from "@phosphor-icons/react"
import Link from "next/link"
import { CharacterAvatar } from "@/shared/components/game/character-avatar"
import { ChoiceChallenge } from "@/shared/components/game/choice-challenge"
import { PageHeader } from "@/shared/components/page-header"
import { MAX_DAILY_RECHARGES } from "@/shared/lib/progress/shop"
import { STREAK_FREEZE_MAX, STREAK_FREEZE_PRICE } from "@/shared/lib/progress/streak"
import { useProgress } from "@/shared/hooks/use-progress"
import { COCO_LOOKS } from "@/shared/lib/game/content/coco-looks"
import { useShopRun } from "../hooks/use-shop-run"
import { SHOP_PROFILE } from "../utils/shop-exercise"

export function ShopSession() {
  const run = useShopRun()
  const { progress, selectLook, buyStreakFreeze } = useProgress()
  const canBuyFreeze =
    progress.coins >= STREAK_FREEZE_PRICE &&
    progress.streak.freezes < STREAK_FREEZE_MAX

  return (
    <main className="flex flex-1 flex-col gap-6">
      <PageHeader
        icon={StorefrontIcon}
        title="Tienda"
        description="Resuelve una palabra que ya viste para ganar monedas y gástalas en looks para Coco."
      />

      {!run.hasWords ? (
        <section className="ui-card-empty flex flex-col items-center gap-4 p-6 text-center">
          <span className="text-4xl" aria-hidden>
            🏪
          </span>
          <p className="font-display font-semibold">
            Completa una misión para desbloquear la recarga
          </p>
          <Link
            href="/"
            className="ui-button ui-button-primary-large"
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
        <section className="ui-card flex flex-col items-center gap-4 p-6 text-center">
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
                className="ui-button ui-button-primary-large w-full"
              >
                Recargar otra vez
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="ui-button ui-button-primary-large w-full"
              >
                Vuelve mañana
              </button>
            )}
            <Link
              href="/"
              className="ui-button ui-button-secondary w-full"
            >
              Volver al mapa
            </Link>
          </div>
        </section>
      ) : (
        <section className="ui-card flex flex-col gap-4 p-6">
          <p className="font-display text-lg font-bold">{`Tu saldo: ${run.coins} monedas`}</p>
          <p className="flex items-center gap-2 font-semibold text-muted">
            <CoinsIcon weight="fill" size={18} aria-hidden />
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
          className="ui-button ui-button-primary-large w-full"
          >
            {run.quotaLeft ? "Ganar monedas" : "Vuelve mañana"}
          </button>
        </section>
      )}

      {run.phase !== "playing" && (
        <section className="ui-card flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-lg font-bold">Protector de racha</h2>
            <p className="text-sm font-semibold text-muted">
              Cubre un día que te saltes al volver a jugar. Puedes guardar hasta{" "}
              {STREAK_FREEZE_MAX}.
            </p>
          </div>
          <p className="font-semibold">
            {`${progress.streak.freezes} de ${STREAK_FREEZE_MAX} guardados · ${STREAK_FREEZE_PRICE} monedas`}
          </p>
          <button
            type="button"
            onClick={() => buyStreakFreeze()}
            disabled={!canBuyFreeze}
            className="ui-button ui-button-primary w-full"
          >
            Proteger racha
          </button>
        </section>
      )}

      {run.phase !== "playing" && (
        <section className="ui-card flex flex-col gap-4 p-6">
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
                  className="ui-button ui-button-primary w-full px-3"
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
