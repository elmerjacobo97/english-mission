import type { RehearsalMessage } from "../types"

export function RehearsalTranscript({
  messages,
  characterRole,
}: {
  messages: RehearsalMessage[]
  characterRole: string
}) {
  return (
    <div
      role="log"
      aria-label="Conversación del ensayo"
      className="flex flex-col gap-3"
    >
      {messages.map((message) => {
        if (message.kind === "hint") {
          const [spanish, ...rest] = message.content.split("\n")
          const english = rest.join(" ").trim()

          return (
            <article
              key={message.id}
              aria-label="Pista de Coco"
              className="rounded-2xl border-2 border-teal/20 bg-teal-soft p-3"
            >
              <p className="font-display text-xs font-bold uppercase tracking-wide text-teal-strong">
                Pista
              </p>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-ink/80">
                {spanish}
              </p>
              {english && (
                <p className="mt-1 font-display text-base font-bold">{english}</p>
              )}
            </article>
          )
        }

        const isUser = message.kind === "user_reply"
        return (
          <article
            key={message.id}
            aria-label={`${isUser ? "Tú" : characterRole}: ${message.content}`}
            className={`max-w-[94%] rounded-2xl p-3 ${
              isUser
                ? "self-end rounded-br-md bg-accent/15"
                : "self-start rounded-bl-md bg-surface"
            }`}
          >
            <p className="font-display text-xs font-bold uppercase tracking-wide text-muted">
              {isUser ? "Tú" : characterRole}
            </p>
            <p className="mt-1 text-sm font-semibold leading-relaxed whitespace-pre-line">
              {message.content}
            </p>
          </article>
        )
      })}
    </div>
  )
}
