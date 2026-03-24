import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

interface ClientPageProps {
  params: Promise<{ clientId: string }>
}

export default async function ClientDetailPage({ params }: ClientPageProps) {
  const { clientId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const practitioner = await prisma.userProfile.findUnique({
    where: { id: user.id },
    select: { role: true },
  })
  if (!practitioner || practitioner.role !== "PRACTITIONER") redirect("/tool")

  // Verify this client belongs to this practitioner
  const client = await prisma.userProfile.findUnique({
    where: { id: clientId, practitionerId: user.id },
    select: { id: true, name: true, email: true, createdAt: true },
  })
  if (!client) notFound()

  // Load all threads + thoughts for this client
  const threads = await prisma.thread.findMany({
    where: { userId: clientId },
    include: {
      insight: true,
      thoughts: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          thought: true,
          pattern: true,
          patternExplanation: true,
          emotion: true,
          balancedThought: true,
          reflectionQuestion: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const allPatterns = threads
    .flatMap((t) => t.thoughts.map((th) => th.pattern))
    .filter((p): p is string => !!p)

  const patternCounts = allPatterns.reduce<Record<string, number>>(
    (acc, p) => ({ ...acc, [p]: (acc[p] ?? 0) + 1 }),
    {}
  )
  const sortedPatterns = Object.entries(patternCounts).sort(
    ([, a], [, b]) => b - a
  )

  const totalThoughts = threads.reduce((sum, t) => sum + t.thoughts.length, 0)

  return (
    <div className="min-h-screen bg-[#0f0f0f] px-4 py-10">
      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <Link
          href="/dashboard"
          className="text-white/40 hover:text-white/70 text-sm flex items-center gap-1.5 mb-8 transition-colors"
        >
          ← Dashboard
        </Link>

        {/* Client header */}
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-white">
            {client.name ?? client.email ?? "Client"}
          </h1>
          {client.email && client.name && (
            <p className="text-white/40 text-sm mt-0.5">{client.email}</p>
          )}
          <p className="text-white/30 text-xs mt-1">
            Using since{" "}
            {client.createdAt.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Reflections", value: totalThoughts },
            { label: "Threads", value: threads.length },
            { label: "Patterns", value: sortedPatterns.length },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-center"
            >
              <p className="text-2xl font-semibold text-white">{value}</p>
              <p className="text-white/40 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Thinking patterns */}
        {sortedPatterns.length > 0 && (
          <section className="mb-8">
            <h2 className="text-white/60 text-xs uppercase tracking-widest mb-3">
              Thinking patterns
            </h2>
            <div className="space-y-2">
              {sortedPatterns.map(([pattern, count]) => (
                <div
                  key={pattern}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between"
                >
                  <span className="text-white/80 text-sm">
                    {formatPattern(pattern)}
                  </span>
                  <span className="text-white/40 text-xs">
                    {count}×
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent threads */}
        <section>
          <h2 className="text-white/60 text-xs uppercase tracking-widest mb-3">
            Recent threads
          </h2>
          {threads.length === 0 ? (
            <p className="text-white/30 text-sm">No activity yet.</p>
          ) : (
            <div className="space-y-3">
              {threads.map((thread) => (
                <div
                  key={thread.id}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-white/70 text-sm font-medium">
                      {thread.situation ?? thread.title ?? "Unnamed thread"}
                    </p>
                    <span className="text-white/30 text-xs ml-4 shrink-0">
                      {thread.createdAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {thread.insight?.dominantPattern && (
                      <span className="bg-white/10 text-white/60 text-xs px-2.5 py-1 rounded-full">
                        {formatPattern(thread.insight.dominantPattern)}
                      </span>
                    )}
                    <span className="text-white/30 text-xs">
                      {thread.thoughts.length} reflection
                      {thread.thoughts.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function formatPattern(pattern: string): string {
  return pattern
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase())
}
