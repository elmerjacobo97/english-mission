"use client"

import type { CharacterId, Mood } from "@/shared/lib/game/types/character"
import { CHARACTERS } from "@/shared/lib/game/content/characters"
import { CharacterAvatar } from "./character-avatar"

type CharacterIntroductionProps = {
  character: CharacterId
  mood?: Mood
}

export function CharacterIntroduction({
  character,
  mood = "curious",
}: CharacterIntroductionProps) {
  const profile = CHARACTERS[character]

  return (
    <aside
      aria-label={`Presentación de ${profile.name}`}
      className="flex items-center gap-4 rounded-3xl border-2 border-teal/20 bg-teal-soft p-4 shadow-card"
    >
      <CharacterAvatar
        character={character}
        mood={mood}
        variant="portrait"
        size={76}
        className="shrink-0"
      />
      <div className="min-w-0">
        <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-teal-strong">
          Conoce a
        </p>
        <h2 className="font-display text-xl font-bold text-ink">{profile.name}</h2>
        <p className="text-sm font-semibold text-muted">{profile.relationship}</p>
        <p className="mt-1 text-sm text-ink">
          <span className="font-semibold">Rasgo:</span> {profile.definingTrait}
        </p>
      </div>
    </aside>
  )
}
