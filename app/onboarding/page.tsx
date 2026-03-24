import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { setRole } from "./actions"

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Welcome to ThoughtLens
          </h1>
          <p className="mt-2 text-sm text-white/40">
            How will you be using it?
          </p>
        </div>

        <div className="space-y-3">
          {/* Practitioner option */}
          <form
            action={async () => {
              "use server"
              await setRole("PRACTITIONER")
            }}
          >
            <button
              type="submit"
              className="w-full group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 rounded-2xl p-6 text-left transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-lg">
                  🧠
                </div>
                <div>
                  <p className="text-white font-medium text-sm">
                    I&apos;m a therapist or coach
                  </p>
                  <p className="text-white/40 text-xs mt-1 leading-relaxed">
                    I want to use this with my clients — view their thinking patterns and prepare for sessions.
                  </p>
                </div>
              </div>
            </button>
          </form>

          {/* Client option */}
          <form
            action={async () => {
              "use server"
              await setRole("CLIENT")
            }}
          >
            <button
              type="submit"
              className="w-full group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 rounded-2xl p-6 text-left transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-lg">
                  💭
                </div>
                <div>
                  <p className="text-white font-medium text-sm">
                    I was invited by my practitioner
                  </p>
                  <p className="text-white/40 text-xs mt-1 leading-relaxed">
                    I want to explore my thoughts between sessions.
                  </p>
                </div>
              </div>
            </button>
          </form>
        </div>

        <p className="mt-6 text-xs text-white/20 text-center">
          You can&apos;t change this later — choose carefully.
        </p>
      </div>
    </div>
  )
}
