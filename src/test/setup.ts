import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"
import { resetProgress } from "@/shared/lib/progress/progress-store"

afterEach(() => {
  cleanup()
  resetProgress()
  window.localStorage.clear()
})
