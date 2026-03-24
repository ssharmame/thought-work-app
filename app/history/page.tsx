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
  })
  const groupedThreads = groupThreadsByDisplayLabel(threads)
  const totalThreads = groupedThreads.length
  const skip = (page - 1) * pageSize
  const visibleThreads = groupedThreads.slice(skip, skip + pageSize)
  const uniqueThoughtEntries = dedupeExactThoughts(
    await prisma.thoughtEntry.findMany({
      where: { userId: user.id },
      select: {
        thought: true,
        pattern: true,
        emotion: true,
        situation: true,
        createdAt: true,
      },
    })
  )

  const totalReflections = uniqueThoughtEntries.length

  // Normalize and count patterns
  const allPatterns = uniqueThoughtEntries
    .map((th) => th.pattern)
    .filter((p): p is string => !!p)
    .map(normalizeKey)

  const patternCounts = allPatterns.reduce<Record<string, number>>(
    (acc, p) => ({ ...acc, [p]: (acc[p] ?? 0) + 1 }),
    {}
  )
  const topPattern = Object.entries(patternCounts).sort(([, a], [, b]) => b - a)[0]
  const topPatternTrend = topPattern
    ? computeWindowTrend(
        uniqueThoughtEntries.filter((entry) => normalizeKey(entry.pattern) === topPattern[0]),
        7
      )
    : "stable"
  const topPatternEmotion = topPattern
    ? Object.entries(
        countBy(uniqueThoughtEntries, (entry) =>
          normalizeKey(entry.pattern) === topPattern[0] ? normalizeEmotionCategory(entry.emotion) : ""
        )
      ).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null
    : null
  const topPatternExample = topPattern
    ? uniqueThoughtEntries.find((entry) => normalizeKey(entry.pattern) === topPattern[0])?.thought ?? null
    : null
  const latestReflection = uniqueThoughtEntries
    .map((thought) => thought.createdAt)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null
  const last7Days = uniqueThoughtEntries.filter((entry) => isWithinDays(entry.createdAt, 7))
  const mostFrequentPattern7d = Object.entries(countBy(last7Days, (entry) => normalizeKey(entry.pattern)))
    .sort(([, a], [, b]) => b - a)[0]?.[0] ?? null
  const topEmotionCategory7d = Object.entries(
    countBy(last7Days, (entry) => normalizeEmotionCategory(entry.emotion))
  )
    .sort(([, a], [, b]) => b - a)[0]?.[0] ?? null
  const emotionTrend = topEmotionCategory7d
    ? computeWindowTrend(
        uniqueThoughtEntries.filter(
          (entry) => normalizeEmotionCategory(entry.emotion) === topEmotionCategory7d
        ),
        7
      )
    : "stable"
  const mostRepeatedSituation7d = Object.entries(
    countBy(last7Days, (entry) => normalizeThemeKey(entry.situation ?? entry.thought))
  ).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null
  const topRelevantKey =
    groupedThreads
      .slice()
      .sort((a, b) => computeThreadRelevanceScore(b) - computeThreadRelevanceScore(a))[0]?.key ?? null

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
        {visibleThreads.length === 0 ? (
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
              <div className="mb-5 rounded-2xl border border-border bg-background/80 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Last 7 days</p>
                <div className="mt-3 space-y-2 text-sm leading-6 text-foreground">
                  <p>
                    <span className="text-muted-foreground">Repeated pattern:</span>{" "}
                    {mostFrequentPattern7d ? formatPattern(mostFrequentPattern7d) : "No clear pattern yet"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Emotion:</span>{" "}
                    {topEmotionCategory7d
                      ? formatEmotionTrend(topEmotionCategory7d, emotionTrend)
                      : "No clear emotion trend yet"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Main theme:</span>{" "}
                    {mostRepeatedSituation7d
                      ? restoreDisplayLabel(mostRepeatedSituation7d)
                      : "No repeated situation yet"}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {visibleThreads.map((thread) => (
                  <ThreadCard
                    key={thread.key}
                    thread={thread}
                    highlighted={topRelevantKey === thread.key}
                  />
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
                    Appeared in {topPattern[1]} reflections and most often showed up with{" "}
                    {topPatternEmotion ? formatDominantEmotion(topPatternEmotion).toLowerCase() : "an unclear emotional signal"}.
                  </p>
                  <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                    <p>Trend: {formatTrendSentence(topPatternTrend)}</p>
                    <p>Linked emotion: {topPatternEmotion ? formatDominantEmotion(topPatternEmotion) : "Not clear yet"}</p>
                    <p>Example thought: {topPatternExample ? `“${shortenThoughtSnippet(topPatternExample)}”` : "Not clear yet"}</p>
                  </div>
                </Card>
              )}
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

type GroupedHistoryThread = {
  key: string
  label: string
  createdAt: Date
  thoughts: ThreadWithThoughts["thoughts"]
  sourceCount: number
  dominantPattern: string | null
  dominantEmotion: string | null
  selfPerception: string | null
  trend: "increasing" | "decreasing" | "stable"
  intensityLabel: string | null
  contextSnippet: string | null
}

function ThreadCard({
  thread,
  highlighted,
}: {
  thread: GroupedHistoryThread
  highlighted: boolean
}) {
  const uniqueThoughts = dedupeExactThoughts(thread.thoughts)

  return (
    <details className="group overflow-hidden rounded-[22px] border border-border bg-card/90">
      <summary className="flex items-start justify-between px-5 py-4 cursor-pointer list-none hover:bg-secondary/20 transition-colors">
        <div className="flex-1 min-w-0 pr-4">
          {highlighted && (
            <span className="mb-2 inline-flex rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
              Most relevant for next session
            </span>
          )}
          <p className="text-foreground text-sm font-medium leading-snug">
            {formatThreadTitle(thread.label, thread.dominantPattern)}
          </p>
          {thread.contextSnippet && thread.contextSnippet !== thread.label && (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Example: &ldquo;{shortenThoughtSnippet(thread.contextSnippet)}&rdquo;
            </p>
          )}

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-muted-foreground text-xs">
              {uniqueThoughts.length} reflection{uniqueThoughts.length !== 1 ? "s" : ""} • {thread.dominantPattern ? `${formatPattern(thread.dominantPattern)} recurring` : "No pattern yet"} • {thread.dominantEmotion ? `Dominant emotion: ${formatDominantEmotion(thread.dominantEmotion)}` : "Emotion still forming"}
            </span>
          </div>
          {thread.selfPerception && (
            <div className="mt-2 flex items-center gap-3 flex-wrap">
              <span className="text-muted-foreground text-xs">
                Self-perception: {thread.selfPerception}
              </span>
            </div>
          )}
          <div className="mt-2 flex items-center gap-3 flex-wrap">
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
              {formatThreadTrend(thread.trend)}
            </span>
            {thread.sourceCount > 1 && (
              <span className="text-muted-foreground text-xs">
                This theme has come up {thread.sourceCount} times
              </span>
            )}
            {thread.intensityLabel && (
              <span className="text-muted-foreground text-xs">
                {thread.intensityLabel}
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
        {uniqueThoughts.map((thought) => (
          <ReflectionRow key={thought.id} thought={thought} />
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

function normalizeKey(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_")
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

function normalizeDisplayLabel(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[“”"'.!?]+/g, "")
    .replace(/\s+/g, " ")
}

function normalizeThemeKey(value: string | null | undefined): string {
  return normalizeDisplayLabel(abstractSituationTheme(value ?? ""))
}

function groupThreadsByDisplayLabel(threads: ThreadWithThoughts[]): GroupedHistoryThread[] {
  const grouped = new Map<string, GroupedHistoryThread>()

  for (const thread of threads) {
    const label = (
      thread.situation ??
      thread.title ??
      thread.thoughts[0]?.thought ??
      "Untitled"
    ).trim()
    const themeLabel = abstractSituationTheme(label)
    const key = normalizeThemeKey(label)

    if (!key) continue

    const existing = grouped.get(key)
    if (!existing) {
      grouped.set(key, {
        key,
        label: themeLabel,
        createdAt: thread.createdAt,
        thoughts: [...thread.thoughts],
        sourceCount: 1,
        dominantPattern: null,
        dominantEmotion: null,
        selfPerception: null,
        trend: "stable",
        intensityLabel: null,
        contextSnippet: thread.thoughts[0]?.thought ?? thread.title ?? null,
      })
      continue
    }

    if (thread.createdAt > existing.createdAt) {
      existing.createdAt = thread.createdAt
      existing.label = themeLabel
      existing.contextSnippet = thread.thoughts[0]?.thought ?? thread.title ?? existing.contextSnippet
    }

    existing.sourceCount += 1
    existing.thoughts.push(...thread.thoughts)
  }

  return Array.from(grouped.values())
    .map((group) => {
      const uniqueThoughts = dedupeExactThoughts(group.thoughts)
      const dominantPattern = Object.entries(
        countBy(uniqueThoughts, (thought) => normalizeKey(thought.pattern))
      ).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null
      const dominantEmotion = Object.entries(
        countBy(uniqueThoughts, (thought) => normalizeEmotionCategory(thought.emotion))
      ).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null
      const selfPerception = Object.entries(
        countBy(uniqueThoughts, (thought) => normalizeSelfPerception(thought.emotion))
      ).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null

      return {
        ...group,
        dominantPattern,
        dominantEmotion,
        selfPerception,
        trend: computeWindowTrend(uniqueThoughts, 7),
        intensityLabel: inferIntensityLabel(uniqueThoughts, dominantEmotion),
        contextSnippet:
          uniqueThoughts.find(
            (thought) =>
              normalizeThemeKey(thought.situation ?? thought.thought) === normalizeThemeKey(group.label)
          )?.thought ??
          uniqueThoughts[0]?.thought ??
          group.contextSnippet,
      }
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

function countBy<T>(items: T[], key: (item: T) => string | null | undefined): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const value = key(item)
    if (!value) return acc
    acc[value] = (acc[value] ?? 0) + 1
    return acc
  }, {})
}

function isWithinDays(date: Date, days: number) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return date >= cutoff
}

function computeWindowTrend(
  items: Array<{ createdAt: Date }>,
  windowDays: number
): "increasing" | "decreasing" | "stable" {
  const now = new Date()
  const currentStart = new Date(now)
  currentStart.setDate(currentStart.getDate() - windowDays)
  const previousStart = new Date(currentStart)
  previousStart.setDate(previousStart.getDate() - windowDays)

  const currentCount = items.filter((item) => item.createdAt >= currentStart).length
  const previousCount = items.filter(
    (item) => item.createdAt >= previousStart && item.createdAt < currentStart
  ).length

  if (currentCount > previousCount) return "increasing"
  if (currentCount < previousCount) return "decreasing"
  return "stable"
}

function computeThreadRelevanceScore(thread: GroupedHistoryThread) {
  const recentBonus = isWithinDays(thread.createdAt, 7) ? 3 : 0
  const intensityBonus = thread.intensityLabel === "Strong emotional impact" ? 6 : 0
  return thread.sourceCount * 3 + dedupeExactThoughts(thread.thoughts).length + recentBonus + intensityBonus
}

function restoreDisplayLabel(label: string) {
  return label.replace(/^\w/, (char) => char.toUpperCase())
}

function formatPattern(pattern: string): string {
  return normalizeKey(pattern)
    .replace(/self_criticism/g, "self-criticism")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

function formatDominantEmotion(emotion: string): string {
  // emotion here is the output of normalizeEmotionCategory — a category key
  const labels: Record<string, string> = {
    anxiety: "Anxiety",
    sadness: "Sadness",
    disappointment: "Disappointment",
    frustration: "Frustration",
    shame: "Shame",
    overwhelm: "Overwhelm",
    loneliness: "Loneliness",
  }
  if (labels[emotion]) return labels[emotion]
  // Fallback for any raw value that slipped through: capitalize + de-underscore
  return emotion
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
}

function normalizeEmotionCategory(emotion: string | null | undefined): string {
  const n = normalizeKey(emotion ?? "")
  if (!n) return ""
  if (n.includes("anx") || n.includes("worr") || n.includes("panic") || n.includes("fear") || n.includes("scar") || n.includes("dread")) return "anxiety"
  if (n.includes("sad") || n.includes("empty") || n.includes("hopeless") || n.includes("depress") || n.includes("grief") || n.includes("misera")) return "sadness"
  if (n.includes("disappoint") || n.includes("frustrat") || n.includes("anger") || n.includes("angry") || n.includes("annoy") || n.includes("irritat") || n.includes("resent")) return "frustration"
  if (n.includes("shame") || n.includes("embarrass") || n.includes("guilt") || n.includes("humiliat") || n.includes("worthless")) return "shame"
  if (n.includes("overwhelm") || n.includes("stress") || n.includes("exhaust") || n.includes("burnout") || n.includes("drain")) return "overwhelm"
  if (n.includes("lonely") || n.includes("isolat") || n.includes("disconnect")) return "loneliness"
  // Preserve the normalized value rather than discarding it — unknown emotions
  // still contribute to trend calculations even if we can't categorize them
  return n
}

function normalizeSelfPerception(emotion: string | null | undefined) {
  const normalized = normalizeKey(emotion ?? "")
  if (!normalized) return ""
  if (normalized.includes("not_good_enough")) return "feels not good enough"
  if (normalized.includes("not_capable") || normalized.includes("failure") || normalized.includes("i_will_fail")) {
    return "feels like failure"
  }
  return ""
}

function formatEmotionTrend(emotion: string, trend: "increasing" | "decreasing" | "stable") {
  const base = formatDominantEmotion(emotion)
  if (trend === "increasing") return `${base} increasing recently`
  if (trend === "decreasing") return `${base} still recurring but slightly reducing`
  return `${base} stable`
}

function inferIntensityLabel(
  thoughts: Array<{ emotion?: string | null; createdAt: Date }>,
  dominantEmotion: string | null
) {
  const intenseEmotion = dominantEmotion
    ? ["devastated", "empty", "hopeless", "panicked", "overwhelmed", "anxious", "anxiety"].includes(normalizeKey(dominantEmotion))
    : false
  const recentCount = thoughts.filter((thought) => isWithinDays(thought.createdAt, 7)).length
  const clusteredRecently = recentCount >= 4
  const totalCount = thoughts.length
  if (intenseEmotion || clusteredRecently || totalCount >= 8) return "Strong emotional impact"
  if (totalCount >= 4) return "Moderate emotional impact"
  return null
}

function abstractSituationTheme(label: string) {
  const normalized = normalizeDisplayLabel(label)
  if (normalized.includes("unemployed") || normalized.includes("find a job") || normalized.includes("job search") || normalized.includes("job")) {
    return "Ongoing uncertainty about job search progress"
  }
  if (normalized.includes("startup") || normalized.includes("funding") || normalized.includes("investor")) {
    return "Ongoing uncertainty about startup progress"
  }
  if (normalized.includes("reply") || normalized.includes("response") || normalized.includes("heard back")) {
    return "Waiting for a response and filling in the gap"
  }
  if (normalized.includes("interview")) {
    return "Uncertainty about interview outcome"
  }
  if (normalized.includes("highway") || normalized.includes("speed") || normalized.includes("ticket")) {
    return "Lingering worry after driving fast on the highway"
  }
  return label
}

function shortenThoughtSnippet(thought: string | null | undefined) {
  const normalized = (thought ?? "").trim().replace(/\s+/g, " ")
  if (!normalized) return ""

  const sentence = normalized.split(/[.?!]/)[0]?.trim() ?? normalized
  if (sentence.length <= 90) return sentence
  return `${sentence.slice(0, 87).trimEnd()}...`
}

function formatTrendSentence(trend: "increasing" | "decreasing" | "stable") {
  if (trend === "increasing") return "Increasing recently"
  if (trend === "decreasing") return "Still recurring but slightly reducing"
  return "Stable pattern"
}

function formatThreadTrend(trend: "increasing" | "decreasing" | "stable") {
  return formatTrendSentence(trend)
}

function formatThreadTitle(label: string, pattern: string | null) {
  const situation = abstractSituationTheme(label)
  if (!pattern) return situation
  return `${situation} → ${formatPatternAsMentalPattern(pattern)}`
}

function formatPatternAsMentalPattern(pattern: string) {
  const normalized = normalizeKey(pattern)

  if (normalized.includes("fortune_telling")) return "predicting negative outcome"
  if (normalized.includes("catastroph")) return "expecting worst-case"
  if (normalized.includes("mind_reading")) return "jumping to conclusions"
  if (normalized.includes("self_criticism")) return "judging yourself harshly"
  if (normalized.includes("overgeneral")) return "imagining failure"
  if (normalized.includes("uncertainty")) return "expecting worst-case"

  return formatPattern(pattern).toLowerCase()
}
