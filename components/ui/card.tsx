import * as React from "react"

import { cn } from "@/lib/utils"

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  title?: React.ReactNode
  children: React.ReactNode
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ title, children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-[20px] border border-border/70 bg-gradient-to-br from-card/80 via-card/70 to-background/70 shadow-soft p-6 font-sans text-foreground",
          className
        )}
        {...props}
      >
        {title && (
          <p className="text-[12px] uppercase tracking-[0.35em] font-display text-muted-foreground/70">
            {title}
          </p>
        )}
        <div className="mt-3 text-[18px] font-medium leading-relaxed text-foreground">{children}</div>
      </div>
    )
  }
)

Card.displayName = "Card"

export { Card }
