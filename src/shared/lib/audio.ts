export type SoundEffect = "correct" | "incorrect" | "mission-complete"

export type AudioState = {
  muted: boolean
}

export const AUDIO_FILES = {
  correct: "/audio/correct.mp3",
  incorrect: "/audio/incorrect.mp3",
  missionComplete: "/audio/mission-complete.mp3",
} as const

const serverSnapshot: AudioState = { muted: false }
let current: AudioState = serverSnapshot
const listeners = new Set<() => void>()
const activeSounds = new Set<HTMLAudioElement>()

function notify(): void {
  listeners.forEach((listener) => listener())
}

function stopSound(audio: HTMLAudioElement): void {
  try {
    audio.pause()
    audio.currentTime = 0
  } catch {
    // Some browsers expose incomplete audio elements after a load failure.
  }
  activeSounds.delete(audio)
}

function stopActiveSounds(): void {
  activeSounds.forEach(stopSound)
}

function sourceFor(effect: SoundEffect): string {
  return effect === "mission-complete"
    ? AUDIO_FILES.missionComplete
    : AUDIO_FILES[effect]
}

export function playSound(effect: SoundEffect): void {
  if (current.muted || typeof window === "undefined" || typeof Audio === "undefined") {
    return
  }

  let audio: HTMLAudioElement | null = null
  try {
    audio = new Audio(sourceFor(effect))
    activeSounds.add(audio)
    const cleanup = () => {
      if (audio) {
        activeSounds.delete(audio)
      }
    }
    audio.addEventListener("ended", cleanup, { once: true })
    audio.addEventListener("error", cleanup, { once: true })
    void Promise.resolve(audio.play()).catch(cleanup)
  } catch {
    if (audio) {
      activeSounds.delete(audio)
    }
  }
}

export function isMuted(): boolean {
  return current.muted
}

export function setMuted(muted: boolean): void {
  if (current.muted === muted) {
    return
  }
  if (muted) {
    stopActiveSounds()
  }
  current = { muted }
  notify()
}

export function toggleMuted(): boolean {
  setMuted(!current.muted)
  return current.muted
}

export function subscribeAudio(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getAudioSnapshot(): AudioState {
  return current
}

export function getAudioServerSnapshot(): AudioState {
  return serverSnapshot
}
