import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { isNew, role } = await ensureUserProfile(
          user.id,
          user.email ?? null,
          user.user_metadata ?? {}
        )

        // New users → onboarding to pick their role
        // Invited clients skip onboarding (role already set to CLIENT)
        // Returning users → route by role
        let destination: string
        if (isNew && !role) {
          destination = "/onboarding"
        } else if (role === "PRACTITIONER") {
          destination = "/dashboard"
        } else {
          destination = "/tool"
        }

        const forwardedHost = request.headers.get("x-forwarded-host")
        const isLocalEnv = process.env.NODE_ENV === "development"

        if (isLocalEnv) {
          return NextResponse.redirect(`${origin}${destination}`)
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${destination}`)
        } else {
          return NextResponse.redirect(`${origin}${destination}`)
        }
      }
    }
  }

  // Auth failed — back to login with error
  return NextResponse.redirect(`${origin}/auth/login?error=send_failed`)
}

// Returns isNew (true on first login) and the role if already determined
async function ensureUserProfile(
  userId: string,
  email: string | null,
  userMeta?: Record<string, unknown>
): Promise<{ isNew: boolean; role: string | null }> {
  const existing = await prisma.userProfile.findUnique({
    where: { id: userId },
  })

  if (!existing) {
    // Check if a placeholder profile was pre-created via invite (matched by email)
    const pendingProfile = email
      ? await prisma.userProfile.findUnique({ where: { email } })
      : null

    if (pendingProfile && pendingProfile.id.startsWith("pending_")) {
      // Invited client — replace placeholder with real auth UUID, role already CLIENT
      await prisma.userProfile.delete({ where: { id: pendingProfile.id } })
      await prisma.userProfile.create({
        data: {
          id: userId,
          email,
          role: "CLIENT",
          name: pendingProfile.name,
          practitionerId: pendingProfile.practitionerId,
        },
      })
      return { isNew: true, role: "CLIENT" }
    } else {
      // Brand new signup — create with no meaningful role yet, send to onboarding
      const practitionerId =
        (userMeta?.practitioner_id as string | undefined) ?? null
      const isInvitedAsClient = userMeta?.invited_as_client === true

      const role = isInvitedAsClient ? "CLIENT" : null

      await prisma.userProfile.create({
        data: {
          id: userId,
          email,
          // Use CLIENT as DB default but flag isNew so we send to onboarding
          // unless they were explicitly invited as a client
          role: role ?? "CLIENT",
          practitionerId,
        },
      })
      // null role signals "needs onboarding" — invited clients already know their role
      return { isNew: true, role }
    }
  } else {
    // Returning user — update email if changed
    if (email && existing.email !== email) {
      await prisma.userProfile.update({
        where: { id: userId },
        data: { email },
      })
    }
    return { isNew: false, role: existing.role }
  }
}
