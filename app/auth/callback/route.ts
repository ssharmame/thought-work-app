import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { claimAnonymousSessions } from "@/repositories/thought.repositories"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const invitationToken = searchParams.get("invitation_token")

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // If this user arrived via an invitation link, hand them off to the
        // Accept / Decline page before touching their profile at all.
        if (invitationToken) {
          const forwardedHost = request.headers.get("x-forwarded-host")
          const isLocalEnv = process.env.NODE_ENV === "development"
          const base = isLocalEnv
            ? origin
            : forwardedHost
              ? `https://${forwardedHost}`
              : origin

          return NextResponse.redirect(
            `${base}/invite/accept/${invitationToken}`
          )
        }

        const { isNew, role } = await ensureUserProfile(
          user.id,
          user.email ?? null,
          user.user_metadata ?? {}
        )

        // Claim any anonymous sessions from before login.
        const cookieHeader = request.headers.get("cookie") ?? ""
        const visitorIdMatch = cookieHeader.match(/tl_claim_visitor=([^;]+)/)
        const claimVisitorId = visitorIdMatch?.[1]?.trim()

        if (isNew && claimVisitorId) {
          await claimAnonymousSessions(claimVisitorId, user.id).catch(() => {})
        }

        // New users → onboarding to pick their role
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

        const redirectUrl = isLocalEnv
          ? `${origin}${destination}`
          : forwardedHost
            ? `https://${forwardedHost}${destination}`
            : `${origin}${destination}`

        const response = NextResponse.redirect(redirectUrl)
        response.cookies.set("tl_claim_visitor", "", { maxAge: 0, path: "/" })
        return response
      }
    }
  }

  // Auth failed — back to login with error
  return NextResponse.redirect(`${origin}/auth/login?error=send_failed`)
}

// Returns isNew (true on first login) and the role if already determined.
// NOTE: invited clients no longer go through this path — they are handled by
// the /invite/accept/[token] page after authentication.
async function ensureUserProfile(
  userId: string,
  email: string | null,
  userMeta?: Record<string, unknown>
): Promise<{ isNew: boolean; role: string | null }> {
  const existing = await prisma.userProfile.findUnique({
    where: { id: userId },
  })

  if (!existing) {
    // Clean up any orphaned pending_ placeholder (from the old invite flow)
    if (email) {
      await prisma.userProfile.deleteMany({
        where: { email, id: { startsWith: "pending_" } },
      })
    }

    // Brand new signup — create with no meaningful role yet, send to onboarding
    await prisma.userProfile.create({
      data: {
        id: userId,
        email,
        role: "CLIENT", // DB default; null role signals onboarding needed
      },
    })
    return { isNew: true, role: null }
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
