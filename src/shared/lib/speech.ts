import { isMuted } from "@/shared/lib/audio"

let cachedVoice: SpeechSynthesisVoice | null = null

export function isSpeechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.speechSynthesis !== "undefined" &&
    typeof window.speechSynthesis.cancel === "function" &&
    typeof window.speechSynthesis.getVoices === "function" &&
    typeof window.speechSynthesis.speak === "function" &&
    typeof SpeechSynthesisUtterance !== "undefined"
  )
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) {
    return cachedVoice
  }
  const voices = window.speechSynthesis.getVoices()
  const english = voices.filter((voice) => voice.lang.startsWith("en"))
  const preferred =
    english.find(
      (voice) =>
        voice.lang === "en-US" &&
        /samantha|google|natural|premium/i.test(voice.name),
    ) ??
    english.find((voice) => voice.lang === "en-US") ??
    english[0]
  cachedVoice = preferred ?? null
  return cachedVoice
}

export function speak(text: string, rate = 0.9): void {
  if (isMuted() || !isSpeechSupported()) {
    return
  }
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = "en-US"
  utterance.rate = rate
  const voice = pickVoice()
  if (voice) {
    utterance.voice = voice
  }
  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking(): void {
  if (!isSpeechSupported()) {
    return
  }
  window.speechSynthesis.cancel()
}

export function subscribeSpeechSupport(): () => void {
  return () => undefined
}

export function getSpeechSupportSnapshot(): boolean {
  return isSpeechSupported()
}

export function getSpeechSupportServerSnapshot(): boolean {
  return false
}
