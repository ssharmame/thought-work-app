"use server"

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
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const practitioner = await prisma.userProfile.findUnique({
    where: { id: user.id },
    select: { role: true },
  })
  if (!practitioner || practitioner.role !== "PRACTITIONER") {
    redirect("/tool")
  }

  // Check if this client email already exists
  const existingProfile = await prisma.userProfile.findUnique({
    where: { email },
  })

  if (existingProfile) {
    if (existingProfile.practitionerId === user.id) {
      // Already their client
      redirect("/dashboard/invite?error=already_client")
    }
    // Link existing user to this practitioner
    await prisma.userProfile.update({
      where: { id: existingProfile.id },
      data: {
        practitionerId: user.id,
        name: clientName ?? existingProfile.name,
      },
    })
  } else {
    // Pre-create a placeholder profile so when they first log in
    // their practitioner link is already set
    await prisma.userProfile.create({
      data: {
        // Temporary placeholder id — will be replaced on first auth callback
        // We store by email and match on callback
        id: `pending_${Date.now()}_${email.replace(/[^a-z0-9]/g, "_")}`,
        email,
        name: clientName,
        role: "CLIENT",
        practitionerId: user.id,
      },
    })
  }

  // Send magic link invite via Supabase admin client
  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    data: {
      practitioner_id: user.id,
      invited_as_client: true,
    },
  })

  if (error) {
    console.error("Invite error:", error)
    redirect("/dashboard/invite?error=send_failed")
  }

  redirect("/dashboard?invited=1")
}
