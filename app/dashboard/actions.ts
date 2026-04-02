"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function unlinkClient(clientId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Verify the client actually belongs to this practitioner before unlinking
  const client = await prisma.userProfile.findUnique({
    where: { id: clientId },
    select: { practitionerId: true },
  })

  if (!client || client.practitionerId !== user.id) {
    throw new Error("Client not found or not yours")
  }

  await prisma.userProfile.update({
    where: { id: clientId },
    data: { practitionerId: null },
  })

  revalidatePath("/dashboard")
}
