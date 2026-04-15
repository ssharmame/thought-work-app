"use server"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export async function acceptInvitation(token: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?returnUrl=/invite/accept/${token}`)

  const invitation = await prisma.clientInvitation.findUnique({
    where: { token },
  })

  if (!invitation) {
    redirect("/invite/accept/invalid")
  }

  if (invitation.status !== "PENDING") {
    redirect(
      invitation.status === "ACCEPTED"
        ? "/tool"
        : `/invite/accept/${token}?status=declined`
    )
  }

  if (invitation.expiresAt < new Date()) {
    redirect(`/invite/accept/${token}?status=expired`)
  }

  // Create or update the UserProfile — link to practitioner as CLIENT
  const existingProfile = await prisma.userProfile.findUnique({
    where: { id: user.id },
  })

  if (existingProfile) {
    await prisma.userProfile.update({
      where: { id: user.id },
      data: {
        role: "CLIENT",
        practitionerId: invitation.practitionerId,
        name: existingProfile.name ?? invitation.clientName ?? null,
      },
    })
  } else {
    await prisma.userProfile.create({
      data: {
        id: user.id,
        email: user.email ?? invitation.clientEmail,
        role: "CLIENT",
        name: invitation.clientName ?? null,
        practitionerId: invitation.practitionerId,
      },
    })
  }

  // Mark invitation as accepted
  await prisma.clientInvitation.update({
    where: { token },
    data: { status: "ACCEPTED" },
  })

  redirect("/tool")
}

export async function declineInvitation(token: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?returnUrl=/invite/accept/${token}`)

  const invitation = await prisma.clientInvitation.findUnique({
    where: { token },
  })

  if (!invitation || invitation.status !== "PENDING") {
    redirect(`/invite/accept/${token}?status=already_handled`)
  }

  await prisma.clientInvitation.update({
    where: { token },
    data: { status: "DECLINED" },
  })

  redirect(`/invite/accept/${token}?status=declined`)
}
