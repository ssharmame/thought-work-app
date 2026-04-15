import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { BrandLogo } from "@/components/brand-logo"
import { PendingSubmitButton } from "@/components/ui/pending-submit-button"
import { acceptInvitation, declineInvitation } from "./actions"

interface Props {
  params: Promise<{ token: string }>
  searchParams: Promise<{ status?: string }>
}

export default async function AcceptInvitePage({ params, searchParams }: Props) {
  const { token } = await params
  const { status } = await searchParams

  const invitation = await prisma.clientInvitation.findUnique({
    where: { token },
    include: {
      practitioner: { select: { name: true, email: true } },
    },
  })

  if (!invitation) notFound()

  // Redirect logged-in users who haven't authenticated yet
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/login?returnUrl=/invite/accept/${token}`)
  }

  const practitionerName = invitation.practitioner.name ?? "Your practitioner"
  const isExpired = invitation.expiresAt < new Date()
  const isAlreadyHandled = invitation.status !== "PENDING"

  // ── Status screens ───────────────────────────────────────────────────────────

  if (status === "declined" || invitation.status === "DECLINED") {
    return (
      <StatusScreen
        icon="👋"
        heading="Invitation declined"
        body={`You've declined ${practitionerName}'s invitation. No changes have been made to your account.`}
      />
    )
  }

  if (invitation.status === "ACCEPTED") {
    return (
      <StatusScreen
        icon="✓"
        heading="Already accepted"
        body="This invitation has already been accepted. Head to the app to get started."
        cta={{ label: "Open ThoughtLens", href: "/tool" }}
      />
    )
  }

  if (isExpired) {
    return (
      <StatusScreen
        icon="⏱"
        heading="Invitation expired"
        body={`This invitation from ${practitionerName} has expired. Ask them to send a new one.`}
      />
    )
  }

  if (isAlreadyHandled) {
    return (
      <StatusScreen
        icon="ℹ"
        heading="Invitation no longer valid"
        body="This invitation link has already been used or is no longer active."
      />
    )
  }

  // ── Accept / Decline UI ──────────────────────────────────────────────────────

  const acceptAction = async () => {
    "use server"
    await acceptInvitation(token)
  }

  const declineAction = async () => {
    "use server"
    await declineInvitation(token)
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5"
      style={{ background: "oklch(0.977 0.008 88)" }}
    >
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <BrandLogo size="md" />
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
          <div className="space-y-2 text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              You&apos;ve been invited
            </p>
            <h1 className="font-display text-2xl font-semibold text-foreground">
              {practitionerName} has invited you to ThoughtLens
            </h1>
            {invitation.clientName && (
              <p className="text-sm text-muted-foreground">
                Hi {invitation.clientName} — accepting will link your account so{" "}
                {practitionerName} can support your reflections between sessions.
              </p>
            )}
            {!invitation.clientName && (
              <p className="text-sm text-muted-foreground">
                Accepting will link your account so {practitionerName} can
                support your reflections between sessions.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <form action={acceptAction}>
              <PendingSubmitButton
                pendingLabel="Accepting..."
                className="w-full bg-foreground text-background font-medium rounded-xl py-3 text-sm hover:opacity-90 transition-opacity"
              >
                Accept invitation
              </PendingSubmitButton>
            </form>

            <form action={declineAction}>
              <PendingSubmitButton
                pendingLabel="Declining..."
                className="w-full bg-transparent border border-border text-foreground font-medium rounded-xl py-3 text-sm hover:bg-muted/40 transition-colors"
              >
                Decline
              </PendingSubmitButton>
            </form>
          </div>
        </div>

        <p className="mt-4 text-xs text-muted-foreground/60 text-center">
          This invitation expires on{" "}
          {invitation.expiresAt.toLocaleDateString("en-AU", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          .
        </p>
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatusScreen({
  icon,
  heading,
  body,
  cta,
}: {
  icon: string
  heading: string
  body: string
  cta?: { label: string; href: string }
}) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5"
      style={{ background: "oklch(0.977 0.008 88)" }}
    >
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <BrandLogo size="md" />
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-4">
          <div className="text-4xl">{icon}</div>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            {heading}
          </h1>
          <p className="text-sm text-muted-foreground">{body}</p>
          {cta && (
            <a
              href={cta.href}
              className="inline-block mt-2 bg-foreground text-background font-medium rounded-xl px-6 py-3 text-sm hover:opacity-90 transition-opacity"
            >
              {cta.label}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
