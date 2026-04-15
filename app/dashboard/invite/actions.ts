"use server"

import { getAppUrl } from "@/lib/app-url"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export async function inviteClient(formData: FormData) {
  const email = (formData.get("email") as string)?.toLowerCase().trim()
  const clientName = (formData.get("name") as string)?.trim() || null

  if (!email || !email.includes("@")) {
    redirect("/dashboard/invite?error=invalid_email")
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const practitioner = await prisma.userProfile.findUnique({
    where: { id: user.id },
    select: { role: true, name: true },
  })
  if (!practitioner || practitioner.role !== "PRACTITIONER") redirect("/tool")

  // Check if this email is already an active client of this practitioner
  const existingProfile = await prisma.userProfile.findUnique({
    where: { email },
    select: { id: true, practitionerId: true },
  })

  if (
    existingProfile &&
    !existingProfile.id.startsWith("pending_") &&
    existingProfile.practitionerId === user.id
  ) {
    redirect("/dashboard/invite?error=already_client")
  }

  // Check for an already-pending invitation for this email from this practitioner
  const existingInvitation = await prisma.clientInvitation.findFirst({
    where: {
      clientEmail: email,
      practitionerId: user.id,
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
  })

  if (existingInvitation) {
    redirect("/dashboard/invite?error=already_invited")
  }

  // Create an invitation record (expires in 7 days)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const invitation = await prisma.clientInvitation.create({
    data: {
      practitionerId: user.id,
      clientEmail: email,
      clientName,
      expiresAt,
    },
  })

  const adminClient = createAdminClient()
  const appUrl = await getAppUrl()

  // Send the invite email via Supabase — the token travels in the redirect URL
  // so we can surface the Accept / Decline UI after the client authenticates.
  const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/auth/callback?invitation_token=${invitation.token}`,
    data: {
      practitioner_id: user.id,
      invited_as_client: true,
    },
  })

  if (error) {
    console.error("Invite email error — status:", (error as { status?: number }).status)
    console.error("Invite email error — message:", error.message)
    console.error("Invite email error — full:", JSON.stringify(error))

    const msg = error.message?.toLowerCase() ?? ""

    // User already has a confirmed Supabase account — inviteUserByEmail won't
    // work for them.  Keep the invitation and give the practitioner a direct
    // acceptance link to share instead.
    if (
      msg.includes("already registered") ||
      msg.includes("user already registered") ||
      msg.includes("email address is already") ||
      (error as { status?: number }).status === 422
    ) {
      redirect(
        `/dashboard?invited=1&share_link=${encodeURIComponent(
          `${appUrl}/invite/accept/${invitation.token}`
        )}`
      )
    }

    // redirectTo not in Supabase's allowed URLs list
    if (msg.includes("redirect") || msg.includes("invalid")) {
      console.error(
        `[invite] Check that "${appUrl}/auth/callback" is listed under ` +
          "Supabase → Authentication → URL Configuration → Redirect URLs"
      )
    }

    // Unexpected error — clean up and surface it
    await prisma.clientInvitation.delete({ where: { id: invitation.id } })
    redirect("/dashboard/invite?error=send_failed")
  }

  redirect("/dashboard?invited=1")
}
