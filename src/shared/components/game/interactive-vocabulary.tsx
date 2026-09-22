"use client"

import { SpeakerHighIcon } from "@phosphor-icons/react"
import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { speak } from "@/shared/lib/speech"
import {
  getAudioServerSnapshot,
  getAudioSnapshot,
  subscribeAudio,
} from "@/shared/lib/audio"
import type { Vocabulary } from "@/shared/lib/game/types/beat"
import {
  segmentInteractiveVocabulary,
  type InteractiveTextSegment,
} from "@/shared/lib/game/utils/interactive-vocabulary"

type InteractiveVocabularyProps = {
  text: string
  vocabulary: Vocabulary[]
  speechAvailable: boolean
}

export function InteractiveVocabulary({
  text,
  vocabulary,
  speechAvailable,
}: InteractiveVocabularyProps) {
  const { muted } = useSyncExternalStore(
    subscribeAudio,
    getAudioSnapshot,
    getAudioServerSnapshot,
  )
  const segments = segmentInteractiveVocabulary(text, vocabulary)
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const activator = useRef<HTMLButtonElement | null>(null)
  const popover = useRef<HTMLSpanElement | null>(null)
  const canSpeak = speechAvailable && !muted

  function closePopover() {
    setOpenIndex(null)
    activator.current?.focus()
  }

  useEffect(() => {
    if (openIndex === null) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        closePopover()
      }
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (popover.current?.contains(target) || activator.current?.contains(target)) {
        return
      }
      setOpenIndex(null)
    }
    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("pointerdown", onPointerDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("pointerdown", onPointerDown)
    }
  }, [openIndex])

  if (segments.length === 1 && segments[0]?.kind === "text") {
    return <>{segments[0].text}</>
  }

  return (
    <span className="leading-relaxed">
      {segments.map((segment, index) => (
        <VocabularySegment
          key={`${segment.kind}-${index}-${segment.text}`}
          segment={segment}
          index={index}
          open={openIndex === index}
          canSpeak={canSpeak}
          activatorRef={activator}
          popoverRef={popover}
          onOpen={() => setOpenIndex(openIndex === index ? null : index)}
          onClose={closePopover}
        />
      ))}
    </span>
  )
}

type VocabularySegmentProps = {
  segment: InteractiveTextSegment
  index: number
  open: boolean
  canSpeak: boolean
  activatorRef: React.MutableRefObject<HTMLButtonElement | null>
  popoverRef: React.MutableRefObject<HTMLSpanElement | null>
  onOpen: () => void
  onClose: () => void
}

function VocabularySegment({
  segment,
  index,
  open,
  canSpeak,
  activatorRef,
  popoverRef,
  onOpen,
  onClose,
}: VocabularySegmentProps) {
  if (segment.kind === "text") {
    return <>{segment.text}</>
  }

  const popoverId = `vocabulary-popover-${index}`
  return (
    <span className="relative inline-block">
      <button
        ref={(element) => {
          if (open) activatorRef.current = element
        }}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={popoverId}
        onClick={onOpen}
        className="rounded-md font-semibold text-teal-strong underline decoration-teal/50 decoration-2 underline-offset-4 hover:bg-teal-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
      >
        {segment.text}
      </button>
      {open && (
        <span
          ref={popoverRef}
          id={popoverId}
          role="dialog"
          aria-label={`Vocabulario: ${segment.en}`}
          className="absolute top-full left-1/2 z-20 mt-2.5 w-max min-w-40 max-w-[min(18rem,calc(100vw-3rem))] -translate-x-1/2 rounded-2xl bg-surface px-3 py-2.5 text-left text-sm font-normal text-ink shadow-[0_12px_28px_rgba(42,29,20,0.18)]"
        >
          <span
            aria-hidden
            className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 rounded-xs bg-surface"
          />
          <span className="relative flex items-center gap-3">
            <span className="min-w-0 flex-1">
              <strong className="block font-display text-base font-bold leading-tight text-ink">
                {segment.en}
              </strong>
              <span className="mt-0.5 block text-sm font-semibold leading-tight text-muted">
                {segment.es}
              </span>
            </span>
            {canSpeak && (
              <button
                type="button"
                onClick={() => speak(segment.en)}
                aria-label={`Escuchar ${segment.en}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-soft text-teal-strong transition hover:bg-teal/15"
              >
                <SpeakerHighIcon size={20} weight="fill" aria-hidden />
              </button>
            )}
          </span>
          <button type="button" onClick={onClose} className="sr-only">
            Cerrar
          </button>
        </span>
      )}
    </span>
  )
}
