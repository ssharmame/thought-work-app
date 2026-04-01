"use client"

import { cn } from "@/lib/utils"

export function Spinner({
  className,
  label = "Loading",
}: {
  className?: string
  label?: string
}) {
  return (
    <span className="inline-flex items-center" role="status" aria-label={label}>
      <span
        className={cn(
          "inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent",
          className
        )}
      />
    </span>
  )
}
