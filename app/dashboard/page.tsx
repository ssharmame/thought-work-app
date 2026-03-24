import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
    select: { role: true, name: true, email: true },
  })

  // Only practitioners can view the dashboard
  if (!profile || profile.role !== "PRACTITIONER") {
    redirect("/tool")
  }

  // Load all clients with their recent thinking patterns
  const clients = await prisma.userProfile.findMany({
    where: { practitionerId: user.id },
    include: {
      threads: {
        include: {
          insight: true,
          thoughts: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true, pattern: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="min-h-screen bg-[#0f0f0f] px-4 py-10">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-xl font-semibold text-white">
              {profile.name ?? "Your practice"}
            </h1>
            <p className="text-sm text-white/40 mt-0.5">
              {clients.length} client{clients.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link
            href="/dashboard/invite"
            className="bg-white text-black text-sm font-medium px-4 py-2 rounded-xl hover:bg-white/90 transition-colors"
          >
            Invite client
          </Link>
        </div>

        {/* Client list */}
        {clients.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {clients.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

type ClientWithThreads = Awaited<
  ReturnType<typeof prisma.userProfile.findMany>
>[number] & {
  threads: Array<{
    id: string
    insight: { dominantPattern: string | null; thoughtCount: number } | null
    thoughts: Array<{ createdAt: Date; pattern: string | null }>
  }>
}

function ClientCard({ client }: { client: ClientWithThreads }) {
  const allPatterns = client.threads
    .flatMap((t) => t.thoughts.map((th) => th.pattern))
    .filter((p): p is string => !!p)

  const patternCounts = allPatterns.reduce<Record<string, number>>(
    (acc, p) => ({ ...acc, [p]: (acc[p] ?? 0) + 1 }),
    {}
  )
  const topPattern = Object.entries(patternCounts).sort(
    ([, a], [, b]) => b - a
  )[0]?.[0]

  const lastActivity = client.threads
    .flatMap((t) => t.thoughts)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
    ?.createdAt

  const totalThoughts = client.threads.reduce(
    (sum, t) => sum + (t.insight?.thoughtCount ?? t.thoughts.length),
    0
  )

  return (
    <Link href={`/dashboard/clients/${client.id}`}>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 hover:border-white/20 transition-all cursor-pointer">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white font-medium text-sm">
              {client.name ?? client.email ?? "Client"}
            </p>
            {client.email && client.name && (
              <p className="text-white/40 text-xs mt-0.5">{client.email}</p>
            )}
          </div>
          <span className="text-white/30 text-xs">
            {lastActivity ? formatRelative(lastActivity) : "No activity yet"}
          </span>
        </div>

        <div className="flex items-center gap-4 mt-4">
          <div className="text-center">
            <p className="text-white text-lg font-semibold">{totalThoughts}</p>
            <p className="text-white/40 text-xs">reflections</p>
          </div>
          <div className="text-center">
            <p className="text-white text-lg font-semibold">
              {client.threads.length}
            </p>
            <p className="text-white/40 text-xs">threads</p>
          </div>
          {topPattern && (
            <div className="ml-auto">
              <span className="bg-white/10 text-white/60 text-xs px-3 py-1 rounded-full">
                {formatPattern(topPattern)}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-20">
      <p className="text-white/40 text-sm mb-2">No clients yet</p>
      <p className="text-white/25 text-xs">
        Invite a client to get started — they&apos;ll use the tool between
        sessions and you&apos;ll see their thinking patterns here.
      </p>
    </div>
  )
}

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

function formatPattern(pattern: string): string {
  return pattern
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase())
}
