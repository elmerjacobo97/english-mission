"use client"

import { formatVideoTime, type TranscriptSegment } from "../utils/video"

type TranscriptViewerProps = {
  segments: TranscriptSegment[]
  activeSegmentIndex: number | null
  onSelectSegment?: (segment: TranscriptSegment, index: number) => void
}

export function TranscriptViewer({
  segments,
  activeSegmentIndex,
  onSelectSegment,
}: TranscriptViewerProps) {
  return (
    <section aria-label="Transcript en inglés" className="flex flex-col gap-2">
      <h2 className="font-display text-lg font-bold">Transcript</h2>
      <ol className="ui-card flex max-h-[32rem] flex-col gap-1 overflow-y-auto p-2">
        {segments.map((segment, index) => {
          const active = activeSegmentIndex === index
          return (
            <li key={`${segment.startMs}-${index}`}>
              <button
                type="button"
                onClick={() => onSelectSegment?.(segment, index)}
                aria-current={active ? "true" : undefined}
                aria-label={`Saltar a ${formatVideoTime(segment.startMs)}: ${segment.text}`}
                className={`flex min-h-12 w-full items-start gap-3 rounded-2xl px-3 py-2 text-left transition hover:bg-paper-2/60 ${
                  active
                    ? "bg-teal-soft text-teal-strong ring-2 ring-teal/30"
                    : "text-ink"
                }`}
              >
                <span className="mt-0.5 w-10 shrink-0 font-display text-xs font-bold text-muted">
                  {formatVideoTime(segment.startMs)}
                </span>
                <span lang="en" className="font-semibold">{segment.text}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
