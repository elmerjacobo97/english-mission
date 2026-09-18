"use client"

import {
  ArrowCounterClockwise,
  Coins,
  MapTrifold,
} from "@phosphor-icons/react"
import Link from "next/link"
import type { Mission } from "../types/mission"
import { MissionStamp } from "./mission-stamp"

type MissionCompleteProps = {
  mission: Mission
  earned: number
  isReplay: boolean
  onRestart: () => void
}

export function MissionComplete({
  mission,
  earned,
  isReplay,
  onRestart,
}: MissionCompleteProps) {
  const total = earned + mission.bonusCoins

  return (
    <section className="animate-rise relative flex flex-col items-center gap-5 rounded-3xl border-2 border-ink/10 bg-surface p-6 text-center shadow-card">
      <MissionStamp
        label="MISIÓN CUMPLIDA"
        className="absolute top-4 right-4"
      />
      <span className="text-6xl" aria-hidden>
        🎉
      </span>
      <h2 className="font-display text-2xl font-bold">¡Misión cumplida!</h2>
      <p className="font-display font-semibold text-muted">
        {mission.emoji} {mission.title}
      </p>

      {isReplay ? (
        <p className="rounded-2xl border-2 border-accent/25 bg-paper px-4 py-3 text-sm font-semibold text-accent-deep">
          Ya conocías esta misión: esta vez no ganas monedas, pero sigues
          practicando.
        </p>
      ) : (
        <dl className="w-full rounded-2xl border-2 border-ink/10 bg-paper px-4 py-3 text-left">
          <div className="flex justify-between py-1 font-semibold">
            <dt>Pruebas superadas</dt>
            <dd className="flex items-center gap-1.5 font-display">
              +{earned}
              <Coins
                weight="duotone"
                size={18}
                className="text-accent-strong"
                aria-hidden
              />
            </dd>
          </div>
          <div className="flex justify-between py-1 font-semibold">
            <dt>Bonus de misión</dt>
            <dd className="flex items-center gap-1.5 font-display">
              +{mission.bonusCoins}
              <Coins
                weight="duotone"
                size={18}
                className="text-accent-strong"
                aria-hidden
              />
            </dd>
          </div>
          <div className="mt-1 flex justify-between border-t-2 border-ink/10 pt-2 font-display font-bold">
            <dt>Total ganado</dt>
            <dd className="flex items-center gap-1.5">
              +{total}
              <Coins weight="fill" size={18} className="text-accent-strong" aria-hidden />
            </dd>
          </div>
        </dl>
      )}

      <div className="flex w-full flex-col gap-2.5">
        <button
          type="button"
          onClick={onRestart}
          className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent-strong px-5 font-display font-semibold text-white shadow-pop transition active:translate-y-0.5"
        >
          <ArrowCounterClockwise weight="bold" size={18} aria-hidden />
          Jugar otra vez
        </button>
        <Link
          href="/"
          className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-ink/10 bg-surface px-5 font-display font-semibold shadow-card transition hover:border-accent hover:bg-paper"
        >
          <MapTrifold weight="fill" size={18} aria-hidden />
          Volver al mapa
        </Link>
      </div>
    </section>
  )
}
