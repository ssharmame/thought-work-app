"use server"

import { createClient } from "@/lib/supabase/server"
import { getAppUrl } from "@/lib/app-url"
import { redirect } from "next/navigation"

export async function signInWithGoogle() {
  const supabase = await createClient()
  const appUrl = await getAppUrl()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${appUrl}/auth/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  })

  if (error || !data.url) {
    redirect("/auth/login?error=oauth_failed")
  }

  redirect(data.url)
}

export async function sendMagicLink(formData: FormData) {
  const email = formData.get("email") as string

  if (!email || !email.includes("@")) {
    redirect("/auth/login?error=invalid_email")
  }

  const supabase = await createClient()
  const appUrl = await getAppUrl()

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback`,
    },
  })

  if (error) {
    console.error("Magic link error:", error)
    redirect("/auth/login?error=send_failed")
  }

  redirect(`/auth/check-email?email=${encodeURIComponent(email)}`)
}
