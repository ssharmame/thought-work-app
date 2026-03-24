import { sendMagicLink, signInWithGoogle } from "./actions"

interface LoginPageProps {
  searchParams: Promise<{ error?: string; invited?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const isInvite = params.invited === "true"

  const errorMessages: Record<string, string> = {
    invalid_email: "Please enter a valid email address.",
    send_failed: "Something went wrong. Please try again.",
    oauth_failed: "Google sign-in failed. Please try again.",
  }
  const errorMessage = params.error ? errorMessages[params.error] : null

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            ThoughtLens
          </h1>
          <p className="mt-2 text-sm text-white/40">
            {isInvite
              ? "Your practitioner has invited you. Sign in to get started."
              : "Sign in to continue"}
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-6">

          {/* Google — primary */}
          <form action={signInWithGoogle}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 bg-white text-black font-medium rounded-xl py-3 text-sm hover:bg-white/90 transition-colors"
            >
              <GoogleIcon />
              Continue with Google
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/25 text-xs">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Magic link — fallback */}
          <form action={sendMagicLink} className="space-y-3">
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="Email address"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
            />
            <button
              type="submit"
              className="w-full bg-white/10 text-white/70 font-medium rounded-xl py-3 text-sm hover:bg-white/15 hover:text-white transition-colors"
            >
              Send magic link
            </button>
          </form>

          {errorMessage && (
            <p className="text-sm text-red-400 text-center">{errorMessage}</p>
          )}
        </div>

        <p className="mt-5 text-xs text-white/20 text-center">
          By signing in you agree to our terms of service.
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  )
}
