import Link from "next/link"
import { sendMagicLink, signInWithGoogle } from "./actions"
import { BrandLogo } from "@/components/brand-logo"
import { PendingSubmitButton } from "@/components/ui/pending-submit-button"

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
    <div
      className="min-h-screen px-4 py-8 sm:px-6 sm:py-12"
      style={{
        background: [
          "radial-gradient(circle at top left, oklch(0.93 0.04 150 / 0.24), transparent 24%)",
          "radial-gradient(circle at top right, oklch(0.92 0.03 220 / 0.16), transparent 22%)",
          "oklch(0.977 0.008 88)",
        ].join(", "),
      }}
    >
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center">
        <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-12 lg:items-center">
          <section className="order-2 max-w-sm lg:order-1">
            {/* Logo */}
            <Link href="/" className="inline-block">
              <BrandLogo size="md" />
            </Link>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <span aria-hidden>←</span>
                Back to home
              </Link>
            </div>

            <h1 className="mt-5 max-w-[14ch] font-display text-[2.0rem] font-medium leading-[1.1] tracking-[-0.02em] text-foreground sm:text-[2.4rem] lg:text-[2.85rem]">
              Sign in to your ThoughtLens workspace.
            </h1>

            <p className="mt-4 max-w-sm text-[0.98rem] leading-[1.75] text-muted-foreground">
              {isInvite
                ? "Your practitioner invited you to continue in ThoughtLens. Sign in to access your reflections and begin."
                : "Use Google or a magic link to get back to your reflections, session summaries, and dashboard."}
            </p>

            <div className="mt-7 space-y-3">
              <p className="text-sm leading-7 text-foreground">
                Return to your reflections, recurring patterns, and pre-session summaries.
              </p>
              <p className="text-sm leading-7 text-foreground">
                Choose Google or a magic link. No extra setup, no extra friction.
              </p>
            </div>
          </section>

          <section
            className="order-1 w-full max-w-md justify-self-center rounded-[24px] border border-border/55 px-4 py-4 sm:px-5 sm:py-5 lg:order-2 lg:justify-self-end lg:rounded-[28px] lg:px-5 lg:py-6"
            style={{
              background:
                "linear-gradient(150deg, oklch(0.996 0.004 88 / 0.98) 0%, oklch(0.972 0.017 150 / 0.74) 100%)",
              boxShadow: "0 24px 70px oklch(0.22 0.018 248 / 0.06), inset 0 1px 0 oklch(1 0 0 / 0.58)",
            }}
          >
            <div className="rounded-[20px] border border-border/55 bg-background/84 px-4 py-4 sm:px-5 sm:py-5 lg:rounded-[22px] lg:px-6 lg:py-6">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/75">
                Secure sign-in
              </p>

              <h2 className="mt-3 font-display text-[1.6rem] font-medium leading-[1.2] tracking-[-0.018em] text-foreground sm:text-[1.85rem]">
                Welcome back
              </h2>

              <p className="mt-2 text-sm leading-[1.7] text-muted-foreground">
                {isInvite
                  ? "Sign in to accept the invitation and continue."
                  : "Choose the simplest way to continue."}
              </p>

              <div className="mt-5 space-y-4 sm:space-y-5">
                <form action={signInWithGoogle}>
                  <PendingSubmitButton
                    pendingLabel="Connecting to Google..."
                    className="flex w-full items-center justify-center gap-3 rounded-xl border border-foreground/10 bg-foreground px-4 py-3.5 text-sm font-semibold text-background transition-opacity hover:opacity-92"
                  >
                    <GoogleIcon />
                    Continue with Google
                  </PendingSubmitButton>
                </form>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border/80" />
                  <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    Or
                  </span>
                  <div className="h-px flex-1 bg-border/80" />
                </div>

                <form action={sendMagicLink} className="space-y-3">
                  <label htmlFor="email" className="block text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    Email
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-border/60 bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/45 focus:outline-none focus:ring-1 focus:ring-foreground/15"
                  />

                  <PendingSubmitButton
                    pendingLabel="Sending magic link..."
                    className="w-full rounded-xl border border-border/60 bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/30"
                  >
                    Send magic link
                  </PendingSubmitButton>
                </form>

                {errorMessage ? (
                  <div className="rounded-xl border border-[oklch(0.72_0.05_25_/_0.45)] bg-[oklch(0.98_0.02_25_/_0.6)] px-4 py-3 text-sm text-[oklch(0.45_0.12_25)]">
                    {errorMessage}
                  </div>
                ) : null}
              </div>
            </div>

            <p className="mt-4 px-2 text-center text-xs leading-6 text-muted-foreground">
              By signing in, you continue to the ThoughtLens workspace.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
