import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { Card } from "@/components/ui/card"
import { BrandLogo } from "@/components/brand-logo"
import { RemoveClientButton } from "@/components/dashboard/remove-client-button"

interface DashboardPageProps {
  searchParams: Promise<{ invited?: string; linked?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
    select: { role: true, name: true, email: true },
  })
  if (!profile || profile.role !== "PRACTITIONER") redirect("/tool")

  const successMessage = params.invited === "1"
    ? "Invite sent — they'll get an email to sign up."
    : params.linked === "1"
    ? "Client linked successfully."
    : null

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
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const allThoughts = await prisma.thoughtEntry.findMany({
    where: { user: { practitionerId: user.id } },
    select: {
      userId: true,
      thought: true,
      createdAt: true,
      pattern: true,
    },
  })
  const uniqueThoughts = dedupeExactThoughts(allThoughts)
  const thoughtsByClient = groupThoughtsByClient(uniqueThoughts)

  // Aggregate stats across all clients
  const totalReflections = uniqueThoughts.length

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const activeThisWeek = uniqueThoughts.filter((thought) => thought.createdAt >= sevenDaysAgo).length

  const latestClientActivity = uniqueThoughts
    .map((thought) => thought.createdAt)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null

  return (
    <div
      className="min-h-screen"
      style={{
        background: [
          "radial-gradient(circle at top right, oklch(0.9 0.05 150 / 0.24), transparent 24%)",
          "radial-gradient(circle at top left, oklch(0.92 0.03 220 / 0.18), transparent 22%)",
          "oklch(0.977 0.008 88)",
        ].join(", "),
      }}
    >
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/55 backdrop-blur-md" style={{ background: "oklch(0.982 0.007 88 / 0.9)" }}>
        <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/tool" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Tool
          </Link>
          <BrandLogo size="sm" />
          <Link
            href="/dashboard/invite"
            className="text-sm font-medium px-4 py-1.5 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            + Invite client
          </Link>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8 md:px-6 md:py-10 space-y-6">
        <Card
          className="rounded-[28px] border border-border/55 px-6 py-6 md:px-8 md:py-8"
          style={{
            background:
              "linear-gradient(145deg, oklch(0.996 0.004 88 / 0.98) 0%, oklch(0.968 0.018 150 / 0.7) 100%)",
            boxShadow: "0 22px 60px oklch(0.22 0.018 248 / 0.06), inset 0 1px 0 oklch(1 0 0 / 0.58)",
          }}
        >
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_360px] lg:items-start">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border/60 bg-background/82 px-3 py-1 text-xs font-medium uppercase tracking-[0.15em]">
                  Practitioner dashboard
                </span>
                <span className="rounded-full border border-border/60 bg-background/82 px-3 py-1 text-xs font-medium uppercase tracking-[0.15em]">
                  {clients.length} client{clients.length !== 1 ? "s" : ""}
                </span>
                {latestClientActivity && (
                  <span className="rounded-full border border-border/60 bg-background/82 px-3 py-1 text-xs font-medium uppercase tracking-[0.15em]">
                    Last activity {formatRelative(latestClientActivity)}
                  </span>
                )}
              </div>
              <div>
                <h1 className="font-display text-4xl font-medium tracking-[-0.02em] text-foreground md:text-5xl">
                  {profile.name ?? "Your practice"}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {profile.email}
                </p>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                A quick read on client activity, reflection volume, and who may need attention soon.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DashboardStatCard label="Clients" value={String(clients.length)} />
              <DashboardStatCard label="Reflections" value={String(totalReflections)} />
              <DashboardStatCard label="Active this week" value={String(activeThisWeek)} />
              <DashboardStatCard
                label="Recent activity"
                value={latestClientActivity ? formatRelative(latestClientActivity) : "None yet"}
                compact
              />
            </div>
          </div>
        </Card>

        {/* Success message */}
        {successMessage && (
          <div className="bg-secondary border border-secondary-foreground/10 text-secondary-foreground text-sm rounded-2xl px-4 py-3">
            {successMessage}
          </div>
        )}

        {/* Client list */}
        {clients.length === 0 ? (
          <EmptyState />
        ) : (
          <Card className="rounded-[24px] border border-border/55 bg-[oklch(0.993_0.004_88_/_0.82)] px-5 py-5 md:px-6 md:py-6">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground/90">Client overview</p>
                <h2 className="mt-2 font-display text-2xl font-medium tracking-[-0.015em] text-foreground">
                  Active clients
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Sorted by most recently added. Open a client to review patterns and session prep.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {clients.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  thoughts={thoughtsByClient.get(client.id) ?? []}
                />
              ))}
            </div>
          </Card>
        )}
      </main>
    </div>
  )
}

type ClientWithThreads = Awaited<ReturnType<typeof prisma.userProfile.findMany>>[number] & {
  threads: Array<{
    id: string
    insight: { dominantPattern: string | null; thoughtCount: number } | null
    thoughts: Array<{ createdAt: Date; pattern: string | null }>
  }>
}

function ClientCard({
  client,
  thoughts,
}: {
  client: ClientWithThreads
  thoughts: Array<{ createdAt: Date; pattern: string | null }>
}) {
  const allThoughts = thoughts

  const patternCounts = allThoughts.reduce<Record<string, number>>((acc, t) => {
    const p = t.pattern?.trim().toLowerCase()
    if (!p) return acc
    acc[p] = (acc[p] ?? 0) + 1
    return acc
  }, {})
  const topPattern = Object.entries(patternCounts).sort(([, a], [, b]) => b - a)[0]

  const lastActivity = allThoughts
    .map((t) => t.createdAt)
    .sort((a, b) => b.getTime() - a.getTime())[0]

  const totalReflections = allThoughts.length

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const activeThisWeek = allThoughts.filter(
    (t) => new Date(t.createdAt) >= sevenDaysAgo
  ).length

  return (
    <Link href={`/dashboard/clients/${client.id}`} className="group">
      <div className="h-full rounded-[24px] border border-border/55 bg-[oklch(0.993_0.004_88_/_0.84)] p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_oklch(0.22_0.018_248_/_0.07)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="font-medium text-foreground group-hover:text-primary transition-colors">
              {client.name ?? client.email ?? "Client"}
            </p>
            {client.email && client.name && (
              <p className="text-muted-foreground text-xs mt-0.5">{client.email}</p>
            )}
          </div>
          <span className="text-muted-foreground text-xs">
            {lastActivity ? formatRelative(lastActivity) : "No activity"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MiniStat label="Reflections" value={String(totalReflections)} />
          <MiniStat label="This week" value={String(activeThisWeek)} />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          {topPattern && (
            <span className="rounded-full border border-border/60 bg-secondary/35 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-secondary-foreground">
              {formatPattern(topPattern[0])}
            </span>
          )}
          <div className="flex items-center gap-3">
            <RemoveClientButton
              clientId={client.id}
              clientName={client.name ?? client.email ?? "this client"}
            />
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              Open →
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function EmptyState() {
  return (
    <Card className="rounded-[24px] border border-border/55 bg-[oklch(0.993_0.004_88_/_0.82)] px-6 py-16 text-center">
      <p className="text-muted-foreground text-sm mb-2">No clients yet</p>
      <p className="text-muted-foreground/60 text-xs mb-6 max-w-xs mx-auto">
        Invite a client to get started — they&apos;ll use the tool between sessions and you&apos;ll see their thinking patterns here.
      </p>
      <Link
        href="/dashboard/invite"
        className="text-sm font-medium px-5 py-2.5 rounded-xl bg-foreground text-background hover:opacity-90 transition-opacity"
      >
        Invite your first client
      </Link>
    </Card>
  )
}

function DashboardStatCard({
  label,
  value,
  compact = false,
}: {
  label: string
  value: string
  compact?: boolean
}) {
  return (
    <div className="rounded-2xl border border-border/55 bg-background/84 px-4 py-4 shadow-[inset_0_1px_0_oklch(1_0_0_/_0.5)]">
      <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground/90">{label}</p>
      <p className={`mt-3 font-display text-foreground ${compact ? "text-sm font-medium leading-6 tracking-[-0.02em]" : "text-4xl font-medium tracking-[-0.02em]"}`}>
        {value}
      </p>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/55 bg-background/76 px-3 py-3 shadow-[inset_0_1px_0_oklch(1_0_0_/_0.45)]">
      <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground/90">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.03em] text-foreground">{value}</p>
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
  return pattern.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
}

function normalizeExactThoughtText(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ")
}

function dedupeExactThoughts<
  T extends {
    thought: string | null
  }
>(items: T[]): T[] {
  const seen = new Set<string>()
  const unique: T[] = []

  for (const item of items) {
    const normalized = normalizeExactThoughtText(item.thought)
    if (!normalized) {
      unique.push(item)
      continue
    }
    if (seen.has(normalized)) continue
    seen.add(normalized)
    unique.push(item)
  }

  return unique
}

function groupThoughtsByClient(
  thoughts: Array<{ userId: string | null; createdAt: Date; pattern: string | null }>
) {
  const grouped = new Map<string, Array<{ createdAt: Date; pattern: string | null }>>()

  for (const thought of thoughts) {
    if (!thought.userId) continue
    const existing = grouped.get(thought.userId) ?? []
    existing.push({ createdAt: thought.createdAt, pattern: thought.pattern })
    grouped.set(thought.userId, existing)
  }

  return grouped
}
