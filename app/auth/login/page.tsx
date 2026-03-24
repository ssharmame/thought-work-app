import { sendMagicLink } from "./actions"

interface LoginPageProps {
  searchParams: Promise<{ error?: string; invited?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const isInvite = params.invited === "true"

  const errorMessages: Record<string, string> = {
    invalid_email: "Please enter a valid email address.",
    send_failed: "Something went wrong sending your link. Please try again.",
  }
  const errorMessage = params.error ? errorMessages[params.error] : null

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            ThoughtLens
          </h1>
          <p className="mt-2 text-sm text-white/40">
            {isInvite
              ? "Your practitioner has invited you. Enter your email to get started."
              : "Sign in to continue"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <form action={sendMagicLink} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm text-white/60 font-medium"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
              />
            </div>

            {errorMessage && (
              <p className="text-sm text-red-400">{errorMessage}</p>
            )}

            <button
              type="submit"
              className="w-full bg-white text-black font-medium rounded-xl py-3 text-sm hover:bg-white/90 transition-colors"
            >
              Send magic link
            </button>
          </form>

          <p className="mt-5 text-xs text-white/30 text-center">
            We&apos;ll email you a secure link — no password needed.
          </p>
        </div>
      </div>
    </div>
  )
}
