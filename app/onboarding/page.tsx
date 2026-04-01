import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { setRole } from "./actions"
import Link from "next/link"
import { BrandLogo } from "@/components/brand-logo"
import { PendingSubmitButton } from "@/components/ui/pending-submit-button"

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

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
        <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1fr)_410px] lg:items-center lg:gap-12">
          <section className="order-2 max-w-sm lg:order-1">
            <Link href="/" className="inline-block">
              <BrandLogo size="md" />
            </Link>

            <h1 className="mt-6 max-w-[12ch] font-display text-[2rem] font-medium leading-[1.08] tracking-[-0.02em] text-foreground sm:text-[2.4rem] lg:text-[2.8rem]">
              Choose how you’ll use ThoughtLens.
            </h1>

            <p className="mt-4 text-[0.98rem] leading-[1.75] text-muted-foreground">
              We tailor the workspace around whether you&apos;re supporting clients or reflecting between sessions yourself.
            </p>

            <div className="mt-7 space-y-3 text-sm leading-7 text-foreground">
              <p>Practitioners get dashboards, summaries, and client tracking.</p>
              <p>Clients get a reflection space designed for between-session work.</p>
            </div>
          </section>

          <section
            className="order-1 w-full max-w-md justify-self-center rounded-[28px] border border-border/55 px-5 py-6 lg:order-2 lg:justify-self-end"
            style={{
              background:
                "linear-gradient(150deg, oklch(0.996 0.004 88 / 0.98) 0%, oklch(0.972 0.017 150 / 0.74) 100%)",
              boxShadow: "0 24px 70px oklch(0.22 0.018 248 / 0.06), inset 0 1px 0 oklch(1 0 0 / 0.58)",
            }}
          >
            <div className="rounded-[22px] border border-border/55 bg-background/84 px-5 py-6 sm:px-6">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/75">
                First-time setup
              </p>

              <h2 className="mt-3 font-display text-[1.65rem] font-medium tracking-[-0.018em] text-foreground">
                Welcome to ThoughtLens
              </h2>

              <p className="mt-2 text-sm leading-[1.7] text-muted-foreground">
                How will you be using it?
              </p>

              <div className="mt-6 space-y-3">
                <form
                  action={async () => {
                    "use server"
                    await setRole("PRACTITIONER")
                  }}
                >
                  <PendingSubmitButton
                    pendingLabel="Setting up practitioner workspace..."
                    className="group flex w-full cursor-pointer items-start gap-4 rounded-2xl border border-border/65 bg-background px-5 py-5 text-left transition-all hover:border-foreground/18 hover:bg-secondary/20"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/55 text-lg">
                      🧠
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        I&apos;m a therapist or coach
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        I want to use this with my clients, review patterns, and prepare for sessions.
                      </p>
                    </div>
                  </PendingSubmitButton>
                </form>

                <form
                  action={async () => {
                    "use server"
                    await setRole("CLIENT")
                  }}
                >
                  <PendingSubmitButton
                    pendingLabel="Setting up your reflection space..."
                    className="group flex w-full cursor-pointer items-start gap-4 rounded-2xl border border-border/65 bg-background px-5 py-5 text-left transition-all hover:border-foreground/18 hover:bg-secondary/20"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/55 text-lg">
                      💭
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        I was invited by my practitioner
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        I want to explore my thoughts between sessions and keep everything in one place.
                      </p>
                    </div>
                  </PendingSubmitButton>
                </form>
              </div>

              <p className="mt-5 text-xs text-center text-muted-foreground">
                You can&apos;t change this later, so choose the option that matches how you&apos;ll use the product.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
