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
    select: { role: true },
  })
  if (!practitioner || practitioner.role !== "PRACTITIONER") redirect("/tool")

  // Check if a UserProfile already exists for this email
  const existingProfile = await prisma.userProfile.findUnique({
    where: { email },
  })

  if (existingProfile) {
    if (existingProfile.id.startsWith("pending_")) {
      await prisma.userProfile.update({
        where: { id: existingProfile.id },
        data: {
          practitionerId: user.id,
          role: "CLIENT",
          name: clientName ?? existingProfile.name,
        },
      })
    } else {
    // User already has an account — just link them, no email needed
      if (existingProfile.practitionerId === user.id) {
        redirect("/dashboard/invite?error=already_client")
      }
      await prisma.userProfile.update({
        where: { id: existingProfile.id },
        data: {
          practitionerId: user.id,
          role: "CLIENT",
          name: clientName ?? existingProfile.name,
        },
      })
      // They're already signed up — redirect straight to dashboard
      redirect("/dashboard?linked=1")
    }
  }

  // New user — pre-create placeholder and send invite email
  if (!existingProfile) {
    await prisma.userProfile.create({
      data: {
        id: `pending_${Date.now()}_${email.replace(/[^a-z0-9]/g, "_")}`,
        email,
        name: clientName,
        role: "CLIENT",
        practitionerId: user.id,
      },
    })
  }

  const adminClient = createAdminClient()
  const appUrl = await getAppUrl()
  const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/auth/callback`,
    data: {
      practitioner_id: user.id,
      invited_as_client: true,
    },
  })

  if (error) {
    console.error("Invite error:", error)
    // Clean up placeholder if email failed
    await prisma.userProfile.deleteMany({
      where: { email, id: { startsWith: "pending_" } },
    })
    redirect("/dashboard/invite?error=send_failed")
  }

  redirect("/dashboard?invited=1")
}
