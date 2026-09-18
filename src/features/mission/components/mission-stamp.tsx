type MissionStampProps = {
  label?: string
  className?: string
}

export function MissionStamp({
  label = "COMPLETADA",
  className = "",
}: MissionStampProps) {
  return (
    <span
      className={`animate-stamp inline-flex items-center rounded-xl border-2 border-double border-teal/60 px-2.5 py-0.5 font-display text-[11px] font-bold uppercase tracking-wider text-teal-strong ${className}`}
    >
      {label}
    </span>
  )
}
