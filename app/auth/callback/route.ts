import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // Upsert UserProfile — safe to call on every login
        await ensureUserProfile(
          user.id,
          user.email ?? null,
          user.user_metadata ?? {}
        )

        // Route by role
        const profile = await prisma.userProfile.findUnique({
          where: { id: user.id },
          select: { role: true },
        })

        const destination =
          profile?.role === "PRACTITIONER" ? "/dashboard" : "/tool"

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

async function ensureUserProfile(
  userId: string,
  email: string | null,
  userMeta?: Record<string, unknown>
) {
  const existing = await prisma.userProfile.findUnique({
    where: { id: userId },
  })

  if (!existing) {
    // Check if a placeholder profile was pre-created via invite (matched by email)
    const pendingProfile = email
      ? await prisma.userProfile.findUnique({ where: { email } })
      : null

    if (pendingProfile && pendingProfile.id.startsWith("pending_")) {
      // Replace placeholder with real auth UUID
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
    } else {
      // Fresh signup — check if invited via user metadata
      const practitionerId =
        (userMeta?.practitioner_id as string | undefined) ?? null
      const isInvitedAsClient = userMeta?.invited_as_client === true

      await prisma.userProfile.create({
        data: {
          id: userId,
          email,
          role: isInvitedAsClient ? "CLIENT" : "CLIENT",
          practitionerId,
        },
      })
    }
  } else if (email && existing.email !== email) {
    await prisma.userProfile.update({
      where: { id: userId },
      data: { email },
    })
  }
}
