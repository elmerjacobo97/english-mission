import type { Icon } from "@phosphor-icons/react"
import type { ReactNode } from "react"

type PageHeaderProps = {
  icon: Icon
  title: string
  description?: string
  aside?: ReactNode
  children?: ReactNode
}

export function PageHeader({
  icon: IconComponent,
  title,
  description,
  aside,
  children,
}: PageHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-3">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
          <IconComponent
            weight="fill"
            size={24}
            className="text-accent-strong"
            aria-hidden
          />
          {title}
        </h1>
        {description && (
          <p className="font-semibold text-muted">{description}</p>
        )}
        {children}
      </div>
      {aside}
    </header>
  )
}
