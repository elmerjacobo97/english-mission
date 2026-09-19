import type { Metadata } from "next"
import { LoginForm } from "@/features/auth/components/login-form"

export const metadata: Metadata = {
  title: "Acceso",
}

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams
  const error = searchParams.error
  const callbackError = Array.isArray(error) ? error[0] : error

  return <LoginForm callbackError={callbackError} />
}
