import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"
import {
  emptyProgress,
  initProgress,
  resetProgress,
} from "@/shared/lib/progress/progress-store"

if (typeof HTMLMediaElement !== "undefined") {
  HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve())
}

afterEach(() => {
  cleanup()
  initProgress(emptyProgress, "")
  resetProgress()
})
