import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getPublicSupabaseEnv } from "@/lib/supabase/config"

type CookieToSet = {
  name: string
  value: string
  options?: Record<string, unknown>
}

export async function createClient() {
  const cookieStore = await cookies()
  const { url, anonKey } = getPublicSupabaseEnv()

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            )
          } catch {
            // setAll called from a Server Component — cookies will be set by middleware
          }
        },
      },
    }
  )
}
