import Link from "next/link"
import { inviteClient } from "./actions"

interface InvitePageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function InvitePage({ searchParams }: InvitePageProps) {
  const params = await searchParams

  const errorMessages: Record<string, string> = {
    invalid_email: "Please enter a valid email address.",
    already_client: "This person is already your client.",
    send_failed: "Something went wrong sending the invite. Please try again.",
  }
  const errorMessage = params.error ? errorMessages[params.error] : null

  return (
    <div className="min-h-screen bg-[#0f0f0f] px-4 py-10">
      <div className="max-w-sm mx-auto">
        <Link
          href="/dashboard"
          className="text-white/40 hover:text-white/70 text-sm flex items-center gap-1.5 mb-8 transition-colors"
        >
          ← Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-xl font-semibold text-white">Invite a client</h1>
          <p className="text-white/40 text-sm mt-1.5">
            They&apos;ll get an email with a link to create their account and
            start using ThoughtLens between sessions.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <form action={inviteClient} className="space-y-4">
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
                required
                placeholder="client@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="name"
                className="block text-sm text-white/60 font-medium"
              >
                Name{" "}
                <span className="text-white/30 font-normal">(optional)</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="First name or full name"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
              />
            </div>

            {errorMessage && (
              <p className="text-sm text-red-400">{errorMessage}</p>
            )}

            <button
              type="submit"
              className="w-full bg-white text-black font-medium rounded-xl py-3 text-sm hover:bg-white/90 transition-colors mt-2"
            >
              Send invite
            </button>
          </form>
        </div>

        <p className="mt-4 text-xs text-white/25 text-center">
          The invite link is valid for 24 hours. You can resend anytime.
        </p>
      </div>
    </div>
  )
}
