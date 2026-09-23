"use client"

import { BookOpenTextIcon, CaretDownIcon } from "@phosphor-icons/react"
import type { GrammarNote as GrammarNoteData } from "@/shared/lib/game/types/beat"
import { CharacterAvatar } from "./character-avatar"

type GrammarNoteProps = {
  note: GrammarNoteData
}

export function GrammarNote({ note }: GrammarNoteProps) {
  return (
    <details
      open={note.open}
      className="group rounded-2xl border-2 border-teal/25 bg-teal-soft px-4 py-3"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 font-display text-sm font-semibold text-teal-strong [&::-webkit-details-marker]:hidden">
        <BookOpenTextIcon weight="fill" size={18} aria-hidden className="shrink-0" />
        <span className="min-w-0 flex-1">
          {note.label ?? "Gramática"}: {note.title}
        </span>
        <CaretDownIcon
          weight="bold"
          size={16}
          aria-hidden
          className="shrink-0 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="mt-3 flex items-start gap-2.5">
        <CharacterAvatar
          character="coco"
          mood="happy"
          size={34}
          className="shrink-0"
        />
        <p className="text-sm font-semibold leading-relaxed">{note.body}</p>
      </div>
    </details>
  )
}
