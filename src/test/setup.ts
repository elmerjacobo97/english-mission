import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"
import {
  emptyProgress,
  initProgress,
  resetProgress,
} from "@/shared/lib/progress/progress-store"

afterEach(() => {
  cleanup()
  initProgress(emptyProgress, "")
  resetProgress()
})
