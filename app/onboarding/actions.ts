"use server"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export async function setRole(role: "PRACTITIONER" | "CLIENT") {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  await prisma.userProfile.update({
    where: { id: user.id },
    data: { role },
  })

  redirect(role === "PRACTITIONER" ? "/dashboard" : "/tool")
}
