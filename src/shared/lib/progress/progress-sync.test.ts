import { beforeEach, describe, expect, test, vi } from "vitest"
import * as supabaseBrowser from "../supabase/browser"
import {
  addCoins,
  emptyProgress,
  getProgressSnapshot,
  initProgress,
} from "./progress-store"
import {
  enqueue,
  flush,
  getSyncServerSnapshot,
  getSyncSnapshot,
  retry,
  subscribeSync,
  type SyncOperation,
} from "./progress-sync"

type WriteResult = { error: { message: string } | null }

function makeClient(
  writeOperation: (operation: SyncOperation) => Promise<WriteResult>,
) {
  const from = vi.fn((table: SyncOperation["table"]) => ({
    upsert: (payload: Record<string, unknown>) =>
      writeOperation({ action: "upsert", table, payload }),
    delete: () => ({
      eq: (_column: string, userId: string) =>
        writeOperation({ action: "delete", table, userId }),
    }),
  }))
  return { from }
}

const browserClient = vi.spyOn(supabaseBrowser, "createSupabaseBrowserClient")

const coreOperation: SyncOperation = {
  action: "upsert",
  table: "progress_core",
  payload: { user_id: "user-1", coins: 10, updated_at: "fixed" },
}

const streakOperation: SyncOperation = {
  action: "upsert",
  table: "streak_state",
  payload: {
    user_id: "user-1",
    current: 1,
    best: 1,
    last_day: "2026-09-18",
    pending_milestone: null,
  },
}

beforeEach(() => {
  browserClient.mockReset()
})

describe("progress sync", () => {
  test("returns a cached server snapshot for useSyncExternalStore", () => {
    expect(getSyncServerSnapshot()).toBe(getSyncServerSnapshot())
  })

  test("flushes operations in FIFO order and is idempotent", async () => {
    const writes: SyncOperation[] = []
    browserClient.mockReturnValue(
      makeClient(async (operation) => {
        writes.push(operation)
        return { error: null }
      }) as never,
    )

    enqueue(coreOperation)
    enqueue(streakOperation)
    const firstFlush = flush()

    expect(flush()).toBe(firstFlush)
    await firstFlush

    expect(writes).toEqual([coreOperation, streakOperation])
    expect(getSyncSnapshot()).toEqual({ state: "idle", pending: 0 })
  })

  test("keeps failed operation pending until retry succeeds", async () => {
    let failed = true
    const writes: SyncOperation[] = []
    browserClient.mockReturnValue(
      makeClient(async (operation) => {
        writes.push(operation)
        return failed ? { error: { message: "offline" } } : { error: null }
      }) as never,
    )

    enqueue(coreOperation)
    await flush()
    expect(getSyncSnapshot()).toEqual({ state: "error", pending: 1 })

    failed = false
    await retry()

    expect(writes).toEqual([coreOperation, coreOperation])
    expect(getSyncSnapshot()).toEqual({ state: "idle", pending: 0 })
  })

  test("retries queued work when browser comes online", async () => {
    let failed = true
    browserClient.mockReturnValue(
      makeClient(async () =>
        failed ? { error: { message: "offline" } } : { error: null },
      ) as never,
    )

    enqueue(coreOperation)
    await flush()
    expect(getSyncSnapshot().state).toBe("error")

    failed = false
    window.dispatchEvent(new Event("online"))
    await flush()

    expect(getSyncSnapshot()).toEqual({ state: "idle", pending: 0 })
  })

  test("publishes status changes to subscribers", async () => {
    const snapshots: Array<{ state: string; pending: number }> = []
    const unsubscribe = subscribeSync(() => {
      snapshots.push(getSyncSnapshot())
    })
    browserClient.mockReturnValue(
      makeClient(async () => ({ error: null })) as never,
    )

    enqueue({
      action: "delete",
      table: "review_cards",
      userId: "user-1",
    })
    await flush()
    unsubscribe()

    expect(snapshots).toEqual([
      { state: "syncing", pending: 1 },
      { state: "idle", pending: 0 },
    ])
  })

  test("keeps optimistic progress after a failed write and retry", async () => {
    let failed = true
    browserClient.mockReturnValue(
      makeClient(async () =>
        failed ? { error: { message: "offline" } } : { error: null },
      ) as never,
    )
    initProgress(emptyProgress, "user-1")

    addCoins(20)
    await flush()
    expect(getProgressSnapshot().coins).toBe(20)
    expect(getSyncSnapshot()).toEqual({ state: "error", pending: 1 })

    failed = false
    await retry()

    expect(getProgressSnapshot().coins).toBe(20)
    expect(getSyncSnapshot()).toEqual({ state: "idle", pending: 0 })
  })
})
