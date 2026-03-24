import { createClient } from "@supabase/supabase-js"
import { getAdminSupabaseEnv } from "@/lib/supabase/config"

// Admin client uses the service_role key — only used in server-side actions.
// NEVER expose this to the browser.
export function createAdminClient() {
  const { url, serviceRoleKey } = getAdminSupabaseEnv()
  return createClient(
    url,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
