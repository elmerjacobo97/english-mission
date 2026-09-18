"use client"

import { useId } from "react"
import { COCO_LOOKS } from "@/lib/game/content/coco-looks"
import { useProgress } from "@/lib/progress/use-progress"
import type { CocoLookId } from "@/lib/progress/types"
import { CHARACTERS } from "@/lib/game/content/characters"
import type { CharacterConfig, CharacterId, Mood } from "@/lib/game/types/character"

const INK = "#2a1d14"

type CharacterAvatarProps = {
  character: CharacterId
  mood?: Mood
  size?: number
  lookId?: CocoLookId
  className?: string
}

function cocoConfig(lookId: CocoLookId): CharacterConfig {
  const look = COCO_LOOKS.find((entry) => entry.id === lookId)
  if (!look) {
    return CHARACTERS.coco
  }
  return {
    ...CHARACTERS.coco,
    shirt: look.shirt,
    hair: look.hair,
    background: look.background,
  }
}

export function CharacterAvatar({
  character,
  mood = "neutral",
  size = 56,
  lookId,
  className = "",
}: CharacterAvatarProps) {
  const { progress } = useProgress()
  const config =
    character === "coco"
      ? cocoConfig(lookId ?? progress.looks.equipped)
      : CHARACTERS[character]
  const clipId = useId()
  const isParrot = config.species === "parrot"
  const eyesClosed = mood === "happy"

  return (
    <svg
      viewBox="0 0 96 96"
      width={size}
      height={size}
      role="img"
      aria-label={config.name}
      className={className}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="48" cy="48" r="46" />
        </clipPath>
      </defs>
      <circle cx="48" cy="48" r="46" fill={config.background} />
      <g clipPath={`url(#${clipId})`}>
        {isParrot ? (
          <ParrotBody config={config} eyesClosed={eyesClosed} />
        ) : (
          <HumanBody config={config} mood={mood} eyesClosed={eyesClosed} />
        )}
      </g>
      <circle
        cx="48"
        cy="48"
        r="46"
        fill="none"
        stroke={INK}
        strokeOpacity="0.12"
        strokeWidth="2"
      />
    </svg>
  )
}

type BodyProps = {
  config: (typeof CHARACTERS)[CharacterId]
  mood: Mood
  eyesClosed: boolean
}

function HumanBody({ config, mood, eyesClosed }: BodyProps) {
  const hasHairBack =
    config.hairStyle === "long" ||
    config.hairStyle === "bun" ||
    config.hairStyle === "curly"

  return (
    <>
      <ellipse cx="48" cy="100" rx="33" ry="26" fill={config.shirt} />
      <rect x="42" y="56" width="12" height="16" rx="6" fill={config.skin} />
      {hasHairBack && <circle cx="48" cy="46" r="24" fill={config.hair} />}
      <circle cx="28" cy="49" r="4.5" fill={config.skin} />
      <circle cx="68" cy="49" r="4.5" fill={config.skin} />
      <circle cx="48" cy="48" r="20" fill={config.skin} />

      {config.hairStyle === "bald" && (
        <>
          <circle cx="30" cy="44" r="5.5" fill={config.hair} />
          <circle cx="66" cy="44" r="5.5" fill={config.hair} />
        </>
      )}
      {config.hairStyle === "short" && (
        <path
          d="M28 45 q1 -19 20 -19 t20 19 q-7 -9 -20 -9 t-20 9 z"
          fill={config.hair}
        />
      )}
      {config.hairStyle === "bun" && (
        <>
          <circle cx="48" cy="19" r="8" fill={config.hair} />
          <path
            d="M28 45 q1 -19 20 -19 t20 19 q-7 -10 -20 -10 t-20 10 z"
            fill={config.hair}
          />
        </>
      )}
      {config.hairStyle === "long" && (
        <>
          <path
            d="M28 45 q1 -19 20 -19 t20 19 q-7 -10 -20 -10 t-20 10 z"
            fill={config.hair}
          />
          <path d="M27 46 q-2 22 5 32 l7 -3 q-6 -12 -5 -29 z" fill={config.hair} />
          <path d="M69 46 q2 22 -5 32 l-7 -3 q6 -12 5 -29 z" fill={config.hair} />
        </>
      )}
      {config.hairStyle === "curly" && (
        <>
          <circle cx="34" cy="32" r="10" fill={config.hair} />
          <circle cx="48" cy="28" r="11" fill={config.hair} />
          <circle cx="62" cy="32" r="10" fill={config.hair} />
          <path d="M29 44 q4 -10 19 -10 t19 10 q-8 -6 -19 -6 t-19 6 z" fill={config.hair} />
        </>
      )}

      {config.accessory === "beard" && (
        <path
          d="M29 50 q0 24 19 24 t19 -24 q-6 11 -19 11 t-19 -11 z"
          fill={config.hair}
        />
      )}

      <Face mood={mood} eyesClosed={eyesClosed} />

      {config.accessory === "glasses" && (
        <g stroke={INK} strokeWidth="2.2" fill="none">
          <circle cx="39" cy="47" r="7" />
          <circle cx="57" cy="47" r="7" />
          <path d="M46 47 h4" />
          <path d="M32 46 l-5 -1" />
          <path d="M64 46 l5 -1" />
        </g>
      )}
      {config.accessory === "earrings" && (
        <>
          <circle cx="28" cy="56" r="2.6" fill="#facc15" />
          <circle cx="68" cy="56" r="2.6" fill="#facc15" />
        </>
      )}
      {config.accessory === "cap" && (
        <>
          <path d="M26 43 a22 22 0 0 1 44 0 z" fill={config.hair} />
          <rect x="21" y="40" width="54" height="7" rx="3.5" fill={config.hair} />
          <rect
            x="21"
            y="44"
            width="54"
            height="3"
            rx="1.5"
            fill={INK}
            opacity="0.25"
          />
        </>
      )}
    </>
  )
}

function ParrotBody({ config, eyesClosed }: Omit<BodyProps, "mood">) {
  return (
    <>
      <ellipse cx="48" cy="98" rx="32" ry="26" fill={config.skin} />
      <path
        d="M66 58 q14 10 8 26 q-16 -1 -20 -16 z"
        fill={config.shirt}
      />
      <circle cx="48" cy="44" r="22" fill={config.skin} />
      <path
        d="M44 24 q0 -14 10 -20 q-1 10 7 13 q6 3 1 8 q-9 5 -18 -1 z"
        fill={config.hair}
      />
      <circle cx="39" cy="41" r="8.5" fill="#f8fafc" />
      <circle cx="58" cy="41" r="7.5" fill="#f8fafc" />
      {eyesClosed ? (
        <>
          <path
            d="M34 42 q5 -5 10 0"
            stroke={INK}
            strokeWidth="2.2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M54 42 q4.5 -4.5 9 0"
            stroke={INK}
            strokeWidth="2.2"
            fill="none"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <circle cx="39" cy="41" r="3.4" fill={INK} />
          <circle cx="58" cy="41" r="3" fill={INK} />
        </>
      )}
      <path d="M46 46 L62 52 L50 68 Z" fill="#f59e0b" />
      <path
        d="M62 52 q-2 9 -9 13"
        stroke="#d97706"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
    </>
  )
}

function Face({ mood, eyesClosed }: { mood: Mood; eyesClosed: boolean }) {
  return (
    <>
      {eyesClosed ? (
        <>
          <path
            d="M35 47 q4 -4 8 0"
            stroke={INK}
            strokeWidth="2.2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M53 47 q4 -4 8 0"
            stroke={INK}
            strokeWidth="2.2"
            fill="none"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <circle cx="39" cy="47" r="2.8" fill={INK} />
          <circle cx="57" cy="47" r="2.8" fill={INK} />
        </>
      )}

      {mood === "sad" ? (
        <>
          <path
            d="M34 40 q5 2 9 4"
            stroke={INK}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M62 40 q-5 2 -9 4"
            stroke={INK}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <path
            d="M34 39 q5 -2 9 0"
            stroke={INK}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M53 39 q4 -2 9 0"
            stroke={INK}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </>
      )}

      {mood === "neutral" && (
        <path
          d="M42 58 q6 3 12 0"
          stroke={INK}
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
      )}
      {mood === "happy" && (
        <>
          <path
            d="M40 56 q8 8 16 0"
            stroke={INK}
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="31" cy="53" r="3.5" fill="#f97316" opacity="0.25" />
          <circle cx="65" cy="53" r="3.5" fill="#f97316" opacity="0.25" />
        </>
      )}
      {mood === "surprised" && (
        <ellipse cx="48" cy="59" rx="3.6" ry="4.4" fill={INK} />
      )}
      {mood === "sad" && (
        <path
          d="M41 60 q7 -6 14 0"
          stroke={INK}
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
      )}
      {mood === "curious" && (
        <path
          d="M41 58 q7 5 13 -2"
          stroke={INK}
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
      )}
    </>
  )
}
