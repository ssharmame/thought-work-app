import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ authenticated: false })
    }

    const profile = await prisma.userProfile.findUnique({
      where: { id: user.id },
      select: { role: true, name: true, email: true },
    })

    return Response.json({
      authenticated: true,
      email: user.email,
      role: profile?.role ?? null,
      name: profile?.name ?? null,
    })
  } catch {
    return Response.json({ authenticated: false })
  }
}
