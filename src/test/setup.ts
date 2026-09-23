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

if (typeof HTMLDialogElement !== "undefined") {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute("open", "")
    }
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute("open")
      this.dispatchEvent(new Event("close"))
    }
  }
}

afterEach(() => {
  cleanup()
  initProgress(emptyProgress, "")
  resetProgress()
})
