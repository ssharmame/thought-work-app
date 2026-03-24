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
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        {/* Icon */}
        <div className="mb-8 flex justify-center">
          <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <svg
              className="w-7 h-7 text-white/60"
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

        <h2 className="text-xl font-semibold text-white mb-2">
          Check your email
        </h2>
        <p className="text-sm text-white/50 mb-1">
          We sent a secure link to
        </p>
        {email && (
          <p className="text-sm text-white/80 font-medium mb-6">{email}</p>
        )}
        <p className="text-sm text-white/40 mb-8">
          Click the link in the email to sign in. It expires in 1 hour.
        </p>

        <Link
          href="/auth/login"
          className="text-sm text-white/40 hover:text-white/70 transition-colors underline underline-offset-4"
        >
          Use a different email
        </Link>
      </div>
    </div>
  )
}
