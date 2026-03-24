"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export async function setRole(role: "PRACTITIONER" | "CLIENT") {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  // 1. Update Prisma UserProfile
  await prisma.userProfile.update({
    where: { id: user.id },
    data: { role },
  })

  // 2. Write role into Supabase user_metadata so middleware can read it
  //    from the JWT without a DB query
  const adminClient = createAdminClient()
  await adminClient.auth.admin.updateUserById(user.id, {
    user_metadata: { role },
  })

  redirect(role === "PRACTITIONER" ? "/dashboard" : "/tool")
}
