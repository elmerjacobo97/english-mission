"use client"

export default function RehearsalsError({
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <section
        role="alert"
        className="flex flex-col items-start gap-3 rounded-[2rem] border-2 border-error/20 bg-error-soft p-6"
      >
        <h1 className="font-display text-xl font-bold text-error">
          No pudimos cargar tus ensayos
        </h1>
        <p className="text-sm font-semibold text-muted">
          Revisa tu conexión e inténtalo de nuevo.
        </p>
        <button
          type="button"
          onClick={retry}
          className="ui-button ui-button-secondary px-3"
        >
          Reintentar
        </button>
      </section>
    </main>
  )
}
