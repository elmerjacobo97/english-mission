"use client"

import { CheckCircleIcon, EnvelopeSimpleIcon } from "@phosphor-icons/react"
import { FormEvent, useState } from "react"
import { signInWithMagicLink } from "../services/auth.service"

type LoginFormProps = {
  callbackError?: string
}

type FormStatus = "idle" | "sending" | "sent" | "error"

function callbackErrorMessage(error: string | undefined) {
  if (!error) {
    return null
  }

  if (error === "missing_code") {
    return "El enlace de acceso está incompleto. Solicita uno nuevo."
  }

  return "No pudimos confirmar el enlace. Solicita uno nuevo."
}

export function LoginForm({ callbackError }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<FormStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const callbackMessage = callbackErrorMessage(callbackError)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus("sending")
    setErrorMessage(null)

    try {
      const { error } = await signInWithMagicLink(email.trim())
      if (error) {
        setStatus("error")
        setErrorMessage("No pudimos enviar el enlace. Intenta de nuevo.")
        return
      }
      setStatus("sent")
    } catch {
      setStatus("error")
      setErrorMessage("No pudimos enviar el enlace. Intenta de nuevo.")
    }
  }

  if (status === "sent") {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4">
        <section className="ui-card flex w-full max-w-md flex-col gap-5 p-6 text-center sm:p-8">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircleIcon weight="fill" size={36} aria-hidden />
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-2xl font-bold">Revisa tu correo</h1>
            <p className="font-semibold text-muted">
              Enviamos un enlace de acceso a {email.trim()}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStatus("idle")}
            className="ui-button ui-button-secondary"
          >
            Usar otro correo
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <section className="ui-card flex w-full max-w-md flex-col gap-6 p-6 sm:p-8">
        <div className="flex flex-col gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-deep shadow-pop">
            <EnvelopeSimpleIcon weight="fill" size={30} aria-hidden />
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-3xl font-bold">Entra a tu misión</h1>
            <p className="font-semibold text-muted">
              Usa tu correo para recibir un enlace de acceso sin contraseña.
            </p>
          </div>
        </div>

        {callbackMessage && (
          <p role="alert" className="rounded-2xl bg-error-soft px-4 py-3 font-semibold text-error">
            {callbackMessage}
          </p>
        )}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="font-display font-semibold">
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@correo.com"
              className="ui-input"
            />
          </div>
          {errorMessage && (
            <p role="alert" className="font-semibold text-error">
              {errorMessage}
            </p>
          )}
          <button
            type="submit"
            disabled={status === "sending"}
            className="ui-button ui-button-primary-large"
          >
            {status === "sending" ? "Enviando enlace..." : "Enviar enlace"}
          </button>
        </form>
      </section>
    </main>
  )
}
