"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function sendMagicLink(formData: FormData) {
  const email = formData.get("email") as string

  if (!email || !email.includes("@")) {
    redirect("/auth/login?error=invalid_email")
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // After clicking the magic link, user lands here
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) {
    console.error("Magic link error:", error)
    redirect("/auth/login?error=send_failed")
  }

  redirect(`/auth/check-email?email=${encodeURIComponent(email)}`)
}
