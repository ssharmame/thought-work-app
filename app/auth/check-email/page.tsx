import Link from "next/link"

interface CheckEmailPageProps {
  searchParams: Promise<{ email?: string }>
}

export default async function CheckEmailPage({
  searchParams,
}: CheckEmailPageProps) {
  const params = await searchParams
  const email = params.email ? decodeURIComponent(params.email) : null

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
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center justify-center">
        <div
          className="w-full max-w-md rounded-[28px] border border-border/55 px-5 py-6 text-center"
          style={{
            background:
              "linear-gradient(150deg, oklch(0.996 0.004 88 / 0.98) 0%, oklch(0.972 0.017 150 / 0.74) 100%)",
            boxShadow: "0 24px 70px oklch(0.22 0.018 248 / 0.06), inset 0 1px 0 oklch(1 0 0 / 0.58)",
          }}
        >
          <div className="rounded-[22px] border border-border/55 bg-background/84 px-6 py-8">
            <div className="mb-8 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border/60 bg-background/80 text-foreground/65">
            <svg
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
              </div>
            </div>

            <h2 className="font-display text-[1.8rem] font-medium tracking-[-0.02em] text-foreground">
              Check your email
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a secure sign-in link to
            </p>
            {email ? (
              <p className="mt-2 text-sm font-medium text-foreground">{email}</p>
            ) : null}
            <p className="mt-5 text-sm leading-7 text-muted-foreground">
              Click the link in the email to sign in. It expires in 1 hour.
            </p>

            <Link
              href="/auth/login"
              className="mt-8 inline-flex items-center justify-center rounded-full border border-border/65 bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/35"
            >
              Use a different email
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
