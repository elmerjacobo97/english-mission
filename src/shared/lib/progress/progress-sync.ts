import * as supabaseBrowser from "../supabase/browser"

export type ProgressTable =
  | "progress_core"
  | "streak_state"
  | "shop_state"
  | "looks_state"
  | "mission_progress"
  | "review_cards"

export type SyncOperation =
  | {
      action: "upsert"
      table: ProgressTable
      payload: Record<string, unknown>
    }
  | { action: "delete"; table: ProgressTable; userId: string }

export type SyncStatus = {
  state: "idle" | "syncing" | "error"
  pending: number
}

const EMPTY_SYNC_STATUS: SyncStatus = { state: "idle", pending: 0 }

const CONFLICT_COLUMNS: Record<ProgressTable, string> = {
  progress_core: "user_id",
  streak_state: "user_id",
  shop_state: "user_id",
  looks_state: "user_id",
  mission_progress: "user_id,slug",
  review_cards: "user_id,word_key",
}

type WriteResult = { error: { message: string } | null }

type WriteTable = {
  upsert(
    payload: Record<string, unknown>,
    options: { onConflict: string },
  ): PromiseLike<WriteResult>
  delete(): { eq(column: string, value: string): PromiseLike<WriteResult> }
}

let status: SyncStatus = { state: "idle", pending: 0 }
const listeners = new Set<() => void>()
const queue: SyncOperation[] = []
let activeFlush: Promise<void> | null = null

function publish(next: SyncStatus): void {
  status = next
  listeners.forEach((listener) => listener())
}

async function write(operation: SyncOperation): Promise<void> {
  const client = supabaseBrowser.createSupabaseBrowserClient()
  const table = client.from(operation.table) as unknown as WriteTable
  const result =
    operation.action === "upsert"
      ? await table.upsert(operation.payload, {
          onConflict: CONFLICT_COLUMNS[operation.table],
        })
      : await table.delete().eq("user_id", operation.userId)

  if (result.error) {
    throw new Error(result.error.message)
  }
}

async function drain(): Promise<void> {
  while (queue.length > 0) {
    try {
      await write(queue[0])
      queue.shift()
      publish({
        state: queue.length === 0 ? "idle" : "syncing",
        pending: queue.length,
      })
    } catch {
      publish({ state: "error", pending: queue.length })
      return
    }
  }
}

export function flush(): Promise<void> {
  if (activeFlush) {
    return activeFlush
  }
  if (queue.length === 0 || status.state === "error") {
    return Promise.resolve()
  }

  activeFlush = drain().finally(() => {
    activeFlush = null
  })
  return activeFlush
}

export function enqueue(operation: SyncOperation): void {
  queue.push(operation)
  if (status.state === "error") {
    publish({ state: "error", pending: queue.length })
    return
  }
  publish({ state: "syncing", pending: queue.length })
  void flush()
}

export function retry(): Promise<void> {
  if (queue.length === 0) {
    publish({ state: "idle", pending: 0 })
    return Promise.resolve()
  }
  publish({ state: "syncing", pending: queue.length })
  return flush()
}

export function subscribeSync(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSyncSnapshot(): SyncStatus {
  return status
}

export function getSyncServerSnapshot(): SyncStatus {
  return EMPTY_SYNC_STATUS
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    void retry()
  })
}
