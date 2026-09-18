import { fireEvent } from "@testing-library/react"

export function submitChallengeForm(): void {
  const form = document.querySelector("#challenge-form")
  if (!form) {
    throw new Error("challenge form not found")
  }
  fireEvent.submit(form)
}
