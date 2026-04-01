"use client"

import * as React from "react"
import { useFormStatus } from "react-dom"

import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"

type PendingSubmitButtonProps = React.ComponentProps<"button"> & {
  pendingLabel: string
}

export function PendingSubmitButton({
  children,
  className,
  pendingLabel,
  disabled,
  ...props
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
      className={cn(className)}
      {...props}
    >
      {pending ? (
        <>
          <Spinner className="size-4" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  )
}
