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
    <div className="min-h-screen" style={{ background: "oklch(0.977 0.008 88)" }}>
      {/* Nav */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b border-border" style={{ background: "oklch(0.977 0.008 88 / 0.92)" }}>
        <nav className="max-w-lg mx-auto px-6 h-16 flex items-center">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Dashboard
          </Link>
          <span className="font-display text-xl font-semibold text-foreground tracking-tight mx-auto">
            ThoughtLens
          </span>
          <div className="w-24" />
        </nav>
      </header>

      <main className="max-w-lg mx-auto px-5 py-10 md:px-6">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold text-foreground">Invite a client</h1>
          <p className="text-muted-foreground text-sm mt-1.5">
            They&apos;ll get an email with a link to create their account and
            start using ThoughtLens between sessions.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 input-card">
          <form action={inviteClient} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm text-foreground/70 font-medium"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="client@example.com"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground/50 text-sm focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="name"
                className="block text-sm text-foreground/70 font-medium"
              >
                Name{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="First name or full name"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground/50 text-sm focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 transition-all"
              />
            </div>

            {errorMessage && (
              <p className="text-sm text-red-500">{errorMessage}</p>
            )}

            <button
              type="submit"
              className="w-full bg-foreground text-background font-medium rounded-xl py-3 text-sm hover:opacity-90 transition-opacity mt-2"
            >
              Send invite
            </button>
          </form>
        </div>

        <p className="mt-4 text-xs text-muted-foreground/60 text-center">
          The invite link is valid for 24 hours. You can resend anytime.
        </p>
      </main>
    </div>
  )
}
