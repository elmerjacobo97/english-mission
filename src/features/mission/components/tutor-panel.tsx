"use client"

import {
  ArrowCounterClockwiseIcon,
  PaperPlaneTiltIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react"
import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react"
import ReactMarkdown from "react-markdown"
import { CharacterAvatar } from "@/shared/components/game/character-avatar"
import type { TutorMessage, TutorReply, TutorRequest } from "@/features/tutor/types"

type TutorPanelProps = {
  missionSlug: string
  beatIndex: number
  userId: string
  onClose: () => void
}

type TutorConversationMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; reply: TutorReply }

type TutorAttempt = Pick<TutorRequest, "message" | "history" | "missionSlug" | "beatIndex">

const conversationPrefix = "english-mission:coco-tutor:v1:"

function isTutorConversationMessage(value: unknown): value is TutorConversationMessage {
  if (!value || typeof value !== "object") return false
  const message = value as Record<string, unknown>
  if (
    (message.role !== "user" && message.role !== "assistant") ||
    typeof message.content !== "string"
  ) {
    return false
  }
  if (message.role === "user") return true

  const reply = message.reply as TutorReply | undefined
  return Boolean(
    reply &&
      typeof reply.explanation === "string" &&
      (reply.correction === null ||
        (reply.correction &&
          typeof reply.correction.original === "string" &&
          typeof reply.correction.corrected === "string" &&
          typeof reply.correction.reason === "string")) &&
      reply.example &&
      typeof reply.example.english === "string" &&
      typeof reply.example.spanish === "string" &&
      (reply.curiosity === null || typeof reply.curiosity === "string"),
  )
}

function readConversation(key: string): TutorConversationMessage[] {
  try {
    const stored = window.localStorage.getItem(key)
    if (!stored) return []
    const parsed: unknown = JSON.parse(stored)
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !Array.isArray((parsed as { messages?: unknown }).messages) ||
      !(parsed as { messages: unknown[] }).messages.every(isTutorConversationMessage)
    ) {
      return []
    }
    return (parsed as { messages: TutorConversationMessage[] }).messages
  } catch {
    return []
  }
}

function replyHistory(reply: TutorReply): string {
  return [
    reply.explanation,
    reply.correction &&
      `Frase original: ${reply.correction.original}. Corrección: ${reply.correction.corrected}. ${reply.correction.reason}`,
    `Ejemplo: ${reply.example.english} (${reply.example.spanish})`,
    reply.curiosity,
  ]
    .filter(Boolean)
    .join(" ")
}

function TutorMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      skipHtml
      components={{
        p: ({ children: content }) => (
          <p className="whitespace-pre-wrap">{content}</p>
        ),
        strong: ({ children: content }) => (
          <strong className="font-bold text-ink">{content}</strong>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  )
}

function TutorAnswer({ reply }: { reply: TutorReply }) {
  return (
    <div className="flex flex-col gap-3 text-sm leading-relaxed">
      <TutorMarkdown>{reply.explanation}</TutorMarkdown>
      {reply.correction && (
        <div className="rounded-xl bg-white/80 p-3">
          <p className="font-display text-xs font-bold uppercase tracking-wide text-muted">
            Corrección
          </p>
          <p className="mt-1 text-muted line-through">{reply.correction.original}</p>
          <p className="font-semibold text-teal-strong">{reply.correction.corrected}</p>
          <div className="mt-1 text-muted">
            <TutorMarkdown>{reply.correction.reason}</TutorMarkdown>
          </div>
        </div>
      )}
      <div className="rounded-xl bg-white/80 p-3">
        <p className="font-display text-xs font-bold uppercase tracking-wide text-muted">
          Ejemplo
        </p>
        <p className="mt-1 font-display text-base font-bold">{reply.example.english}</p>
        <p className="text-muted">{reply.example.spanish}</p>
      </div>
      {reply.curiosity && (
        <div className="rounded-xl bg-accent/10 p-3 text-muted">
          <span className="font-bold text-ink">Dato curioso: </span>
          <TutorMarkdown>{reply.curiosity}</TutorMarkdown>
        </div>
      )}
    </div>
  )
}

export function TutorPanel({ missionSlug, beatIndex, userId, onClose }: TutorPanelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const skipNextPersist = useRef(false)
  const [messages, setMessages] = useState<TutorConversationMessage[]>([])
  const storageKey = `${conversationPrefix}${userId}:${missionSlug}`
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryRequest, setRetryRequest] = useState<TutorAttempt | null>(null)
  const [quotaExhausted, setQuotaExhausted] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setMessages(readConversation(storageKey))
      setLoadedKey(storageKey)
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [storageKey])

  useEffect(() => {
    if (loadedKey !== storageKey) return
    if (skipNextPersist.current) {
      skipNextPersist.current = false
      return
    }
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ messages }))
    } catch {
      // Keep the conversation available in memory when storage is unavailable.
    }
  }, [loadedKey, messages, storageKey])

  function clearHistory() {
    const accountPrefix = `${conversationPrefix}${userId}:`
    try {
      const keys = Array.from({ length: window.localStorage.length }, (_, index) =>
        window.localStorage.key(index),
      )
      for (const key of keys) {
        if (key?.startsWith(accountPrefix)) window.localStorage.removeItem(key)
      }
    } catch {
      // Keep the panel usable in memory when storage is unavailable.
    }
    skipNextPersist.current = true
    setMessages([])
  }

  async function sendQuestion(attempt: TutorAttempt) {
    setSending(true)
    setError(null)
    setRetryRequest(null)

    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attempt),
      })
      const payload = await response.json()

      if (!response.ok) {
        if (payload?.error?.code === "daily-limit") {
          setQuotaExhausted(true)
          setError("Alcanzaste las 50 consultas de hoy. Coco estará aquí mañana.")
        } else {
          setError("Coco no pudo responder. Intenta de nuevo.")
          setRetryRequest(attempt)
        }
        return
      }

      const reply = payload.reply as TutorReply
      setMessages((current) => [
        ...current,
        { role: "assistant", content: replyHistory(reply), reply },
      ])
    } catch {
      setError("No se pudo conectar con Coco. Intenta de nuevo.")
      setRetryRequest(attempt)
    } finally {
      setSending(false)
    }
  }

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = draft.trim()
    if (!message || sending || quotaExhausted) return

    const history: TutorMessage[] = messages.slice(-20).map(({ role, content }) => ({
      role,
      content,
    }))
    const attempt = { message, history, missionSlug, beatIndex }
    setMessages((current) => [...current, { role: "user", content: message }])
    setDraft("")
    await sendQuestion(attempt)
  }

  function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      event.currentTarget.close()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      id="coco-tutor-panel"
      aria-labelledby="tutor-panel-title"
      aria-modal="true"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault()
        dialogRef.current?.close()
      }}
      onClick={closeOnBackdrop}
      className="fixed inset-x-0 top-auto bottom-0 m-0 h-[min(44rem,88dvh)] max-h-[88dvh] w-full max-w-none overflow-hidden border-0 bg-transparent p-0 text-ink backdrop:bg-ink/40 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-200 sm:inset-y-0 sm:left-auto sm:right-0 sm:h-dvh sm:max-h-dvh sm:w-[min(26rem,100vw)] sm:motion-safe:slide-in-from-bottom-0 sm:motion-safe:slide-in-from-right-4"
    >
      <section className="ui-card flex h-full min-h-0 flex-col gap-4 rounded-t-3xl border-teal/20 bg-teal-soft p-4 sm:rounded-none sm:border-y-0 sm:border-r-0 sm:border-l sm:p-5">
        <div
          aria-hidden
          className="mx-auto h-1 w-10 shrink-0 rounded-full bg-ink/20 sm:hidden"
        />
        <header className="flex items-center gap-3">
          <CharacterAvatar character="coco" mood="curious" size={52} />
          <div className="min-w-0 flex-1">
            <h2 id="tutor-panel-title" className="font-display text-lg font-bold">
              Pregúntale a Coco
            </h2>
            <p className="text-sm font-semibold text-muted">
              Dudas de inglés y correcciones a tu ritmo
            </p>
          </div>
          <button
            type="button"
            onClick={clearHistory}
            aria-label="Limpiar historial"
            className="ui-icon-button ui-icon-button-danger shrink-0"
          >
            <TrashIcon size={18} weight="bold" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Cerrar tutor"
            className="ui-icon-button"
          >
            <XIcon size={18} weight="bold" aria-hidden />
          </button>
        </header>

        <div
          role="log"
          aria-label="Conversación con Coco"
          aria-live="polite"
          aria-busy={sending}
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-2xl bg-paper/70 p-3"
        >
          {messages.length === 0 ? (
            <p className="rounded-xl bg-white/80 p-3 text-sm leading-relaxed text-muted">
              ¡Hola! Pregúntame sobre inglés o comparte una frase para corregirla.
            </p>
          ) : (
            messages.map((message, index) => (
              <article
                key={`${message.role}-${index}`}
                className={`max-w-[94%] rounded-2xl p-3 ${
                  message.role === "user"
                    ? "self-end rounded-br-md bg-accent/15"
                    : "self-start rounded-bl-md bg-white/90"
                }`}
              >
                {message.role === "assistant" ? (
                  <TutorAnswer reply={message.reply} />
                ) : (
                  <p className="text-sm font-semibold leading-relaxed">{message.content}</p>
                )}
              </article>
            ))
          )}
          {sending && (
            <div
              role="status"
              aria-live="polite"
              className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200 flex self-start items-center gap-3 rounded-2xl rounded-bl-md bg-white/90 p-3"
            >
              <span aria-hidden="true" className="shrink-0">
                <CharacterAvatar character="coco" mood="curious" size={44} />
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="font-display text-sm font-bold text-ink">
                  Coco está pensando…
                </p>
                <p className="text-xs font-semibold text-muted">
                  Busca una explicación clara para ti
                </p>
                <span aria-hidden="true" className="flex items-center gap-1 pt-1">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="size-1.5 rounded-full bg-teal-strong motion-safe:animate-pulse"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-error-soft p-3 text-sm text-error">
            <p>{error}</p>
            {retryRequest && (
              <button
                type="button"
                onClick={() => void sendQuestion(retryRequest)}
                disabled={sending}
                className="ui-button ui-button-secondary px-3"
              >
                <ArrowCounterClockwiseIcon size={16} weight="bold" aria-hidden />
                Reintentar
              </button>
            )}
          </div>
        )}

        {quotaExhausted ? (
          <p className="font-display text-sm font-semibold text-muted">
            Límite diario alcanzado · 50 de 50
          </p>
        ) : (
          <form onSubmit={submitQuestion} className="flex flex-col gap-3">
            <label htmlFor="tutor-question" className="sr-only">
              Tu pregunta para Coco
            </label>
            <textarea
              id="tutor-question"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={1000}
              rows={2}
              disabled={sending}
              placeholder="Escribe tu duda o frase en inglés…"
              className="ui-input resize-y"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-muted">
                {draft.length}/1000 caracteres
              </span>
              <button
                type="submit"
                disabled={!draft.trim() || sending}
                className="ui-button ui-button-primary"
              >
                Preguntar
                <PaperPlaneTiltIcon size={16} weight="fill" aria-hidden />
              </button>
            </div>
          </form>
        )}
      </section>
    </dialog>
  )
}
