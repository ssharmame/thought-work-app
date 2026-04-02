"use client"

import { useState } from "react"
import { unlinkClient } from "@/app/dashboard/actions"
import { Spinner } from "@/components/ui/spinner"

export function RemoveClientButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setConfirming(true)
  }

  function handleCancel(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setConfirming(false)
  }

  async function handleConfirm(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setLoading(true)
    try {
      await unlinkClient(clientId)
    } catch {
      setLoading(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div
        className="flex items-center gap-2 rounded-full border border-border bg-background/95 px-2.5 py-1.5"
        onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
      >
        <span className="text-[11px] text-muted-foreground">Remove?</span>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <Spinner className="size-3" />
              Removing...
            </>
          ) : (
            "Yes"
          )}
        </button>
        <button
          onClick={handleCancel}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          No
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/65 bg-background/90 text-muted-foreground transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
      aria-label={`Remove ${clientName} from dashboard`}
      title={`Remove ${clientName} from dashboard`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 6h18" />
        <path d="M8 6V4.75A1.75 1.75 0 0 1 9.75 3h4.5A1.75 1.75 0 0 1 16 4.75V6" />
        <path d="M6.75 6 7.6 18.3A2 2 0 0 0 9.59 20h4.82a2 2 0 0 0 1.99-1.7L17.25 6" />
        <path d="M10 10.25v5.5" />
        <path d="M14 10.25v5.5" />
      </svg>
    </button>
  )
}
