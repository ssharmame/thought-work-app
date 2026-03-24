import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { Card } from "@/components/ui/card"

interface HistoryPageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1)
  const pageSize = 7
  const skip = (page - 1) * pageSize

  const totalThreads = await prisma.thread.count({
    where: { userId: user.id },
  })

  const threads = await prisma.thread.findMany({
    where: { userId: user.id },
    include: {
      insight: true,
      thoughts: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          thought: true,
          automaticThought: true,
          pattern: true,
          patternExplanation: true,
          emotion: true,
          balancedThought: true,
          reflectionQuestion: true,
          situation: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: pageSize,
  })

  const totalReflections = await prisma.thoughtEntry.count({
    where: { userId: user.id },
  })

  // Normalize and count patterns
  const allPatterns = threads
    .flatMap((t) => t.thoughts.map((th) => th.pattern))
    .filter((p): p is string => !!p)
    .map(normalizeKey)

  const patternCounts = allPatterns.reduce<Record<string, number>>(
    (acc, p) => ({ ...acc, [p]: (acc[p] ?? 0) + 1 }),
    {}
  )
  const topPattern = Object.entries(patternCounts).sort(([, a], [, b]) => b - a)[0]
  const latestReflection = threads
    .flatMap((thread) => thread.thoughts)
    .map((thought) => thought.createdAt)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null

  return (
    <div
      className="min-h-screen"
      style={{
        background: [
          "radial-gradient(circle at top right, oklch(0.9 0.05 150 / 0.2), transparent 22%)",
          "radial-gradient(circle at top left, oklch(0.92 0.03 220 / 0.16), transparent 20%)",
          "oklch(0.977 0.008 88)",
        ].join(", "),
      }}
    >
      {/* Nav */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b border-border" style={{ background: "oklch(0.977 0.008 88 / 0.92)" }}>
        <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/tool" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Tool
          </Link>
          <span className="font-display text-xl font-semibold text-foreground tracking-tight">
            ThoughtLens
          </span>
          <Link
            href="/tool"
            className="text-sm font-medium px-4 py-1.5 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            + New
          </Link>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8 md:px-6 md:py-10 space-y-6">
        <Card
          className="rounded-[28px] border border-border/80 px-6 py-6 md:px-8 md:py-8"
          style={{
            background:
              "linear-gradient(145deg, oklch(0.995 0.004 88 / 0.98) 0%, oklch(0.965 0.02 150 / 0.72) 100%)",
            boxShadow: "0 22px 60px oklch(0.22 0.018 248 / 0.08)",
          }}
        >
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_360px] lg:items-start">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border bg-background px-3 py-1">
                  Reflection archive
                </span>
                <span className="rounded-full border border-border bg-background px-3 py-1">
                  {totalThreads} thread{totalThreads !== 1 ? "s" : ""}
                </span>
                {latestReflection && (
                  <span className="rounded-full border border-border bg-background px-3 py-1">
                    Last reflection {formatRelative(latestReflection)}
                  </span>
                )}
              </div>
              <div>
                <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
                  Your reflections
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  A calmer view of past sessions, recurring patterns, and the reframes you came back to.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <HistoryStatCard label="Reflections" value={String(totalReflections)} />
              <HistoryStatCard label="Threads" value={String(totalThreads)} />
              <HistoryStatCard
                label="Top pattern"
                value={topPattern ? formatPattern(topPattern[0]) : "None yet"}
                compact
              />
              <HistoryStatCard
                label="Recent"
                value={latestReflection ? formatRelative(latestReflection) : "None yet"}
                compact
              />
            </div>
          </div>
        </Card>

        {/* Thread list */}
        {threads.length === 0 ? (
          <Card className="rounded-[24px] px-6 py-16 text-center">
            <p className="text-muted-foreground text-sm mb-2">No reflections yet</p>
            <p className="text-muted-foreground/60 text-xs mb-6 max-w-xs mx-auto">
              Your thoughts and patterns will appear here after your first session.
            </p>
            <Link
              href="/tool"
              className="text-sm font-medium px-5 py-2.5 rounded-xl bg-foreground text-background hover:opacity-90 transition-opacity"
            >
              Start your first reflection
            </Link>
          </Card>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_320px]">
            <Card className="rounded-[24px] border border-border/80 px-5 py-5 md:px-6 md:py-6">
              <div className="mb-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Sessions</p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">
                  Reflection threads
                </h2>
              </div>
              <div className="space-y-3">
                {threads.map((thread) => (
                  <ThreadCard key={thread.id} thread={thread} />
                ))}
              </div>
              {totalThreads > pageSize && (
                <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {Math.max(1, Math.ceil(totalThreads / pageSize))}
                  </p>
                  <div className="flex items-center gap-2">
                    {page > 1 ? (
                      <Link
                        href={`/history?page=${page - 1}`}
                        className="rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground transition-colors hover:bg-secondary/20"
                      >
                        Previous
                      </Link>
                    ) : (
                      <span className="rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground/50">
                        Previous
                      </span>
                    )}
                    {page * pageSize < totalThreads ? (
                      <Link
                        href={`/history?page=${page + 1}`}
                        className="rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground transition-colors hover:bg-secondary/20"
                      >
                        Next
                      </Link>
                    ) : (
                      <span className="rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground/50">
                        Next
                      </span>
                    )}
                  </div>
                </div>
              )}
            </Card>

            <div className="space-y-6">
              {topPattern && totalReflections >= 3 && (
                <Card className="rounded-[24px] border border-border/80 px-5 py-5 md:px-6 md:py-6">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Most common pattern</p>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">
                    {formatPattern(topPattern[0])}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Showed up in {topPattern[1]} of your reflections.
                  </p>
                </Card>
              )}

              <Card className="rounded-[24px] border border-border/80 px-5 py-5 md:px-6 md:py-6">
                <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">How to use this page</p>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                  <li>Open a thread to see the sequence of patterns, feelings, and reframes.</li>
                  <li>Use this archive to notice what themes return across different situations.</li>
                  <li>The most recent threads appear first so you can revisit them quickly.</li>
                </ul>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

type ThreadWithThoughts = Awaited<ReturnType<typeof prisma.thread.findMany>>[number] & {
  thoughts: Array<{
    id: string
    thought: string
    automaticThought: string | null
    pattern: string | null
    patternExplanation: string | null
    emotion: string
    balancedThought: string
    reflectionQuestion: string
    situation: string | null
    createdAt: Date
  }>
  insight: { dominantPattern: string | null; dominantEmotion: string | null } | null
}

function ThreadCard({ thread }: { thread: ThreadWithThoughts }) {
  const patterns = [
    ...new Set(
      thread.thoughts
        .map((t) => t.pattern)
        .filter(Boolean)
        .map((p) => normalizeKey(p!))
    ),
  ]

  return (
    <details className="group overflow-hidden rounded-[22px] border border-border bg-card/90">
      <summary className="flex items-start justify-between px-5 py-4 cursor-pointer list-none hover:bg-secondary/20 transition-colors">
        <div className="flex-1 min-w-0 pr-4">
          <p className="text-foreground text-sm font-medium leading-snug">
            {thread.situation ?? thread.title ?? thread.thoughts[0]?.thought?.slice(0, 80) ?? "Untitled"}
          </p>

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-muted-foreground text-xs">
              {thread.createdAt.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year:
                  thread.createdAt.getFullYear() !== new Date().getFullYear()
                    ? "numeric"
                    : undefined,
              })}
            </span>
            <span className="text-muted-foreground text-xs">
              {thread.thoughts.length} reflection{thread.thoughts.length !== 1 ? "s" : ""}
            </span>
            {patterns[0] && (
              <span className="bg-secondary text-secondary-foreground text-xs px-2.5 py-0.5 rounded-full">
                {formatPattern(patterns[0])}
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <svg
          className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5 transition-transform group-open:rotate-180"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </summary>

      {/* Expanded: reflections */}
      <div className="border-t border-border divide-y divide-border">
        {thread.thoughts.map((thought, i) => (
          <ReflectionRow key={thought.id} thought={thought} index={i} />
        ))}
      </div>
    </details>
  )
}

function ReflectionRow({
  thought,
}: {
  thought: ThreadWithThoughts["thoughts"][number]
}) {
  const displayThought = thought.automaticThought ?? thought.thought

  return (
    <div className="px-5 py-4">
      <p className="text-foreground/70 text-sm italic mb-3 leading-relaxed">
        &ldquo;{displayThought}&rdquo;
      </p>

      <div className="space-y-2">
        {thought.pattern && (
          <InfoRow label="Pattern" value={formatPattern(thought.pattern)} />
        )}
        {thought.emotion && (
          <InfoRow label="Feeling" value={capitalize(thought.emotion)} />
        )}
        {thought.reflectionQuestion && (
          <InfoRow label="Reflection" value={thought.reflectionQuestion} />
        )}
        {thought.balancedThought && (
          <InfoRow label="Reframe" value={thought.balancedThought} highlight />
        )}
      </div>

      <p className="text-muted-foreground/50 text-xs mt-3">
        {thought.createdAt.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })}
      </p>
    </div>
  )
}

function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground text-xs w-16 shrink-0 pt-0.5">{label}</span>
      <span
        className={`text-xs leading-relaxed ${
          highlight ? "text-foreground/80 font-medium" : "text-foreground/60"
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function HistoryStatCard({
  label,
  value,
  compact = false,
}: {
  label: string
  value: string
  compact?: boolean
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/90 px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
      <p className={`mt-3 text-foreground ${compact ? "text-sm font-medium leading-6" : "text-4xl font-semibold tracking-tight"}`}>
        {value}
      </p>
    </div>
  )
}

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

function normalizeKey(s: string): string {
  return s.trim().toLowerCase().replace(/[\s-]+/g, "_")
}

function formatPattern(pattern: string): string {
  return normalizeKey(pattern)
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}
