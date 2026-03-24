import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import type { CSSProperties } from "react"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { Card } from "@/components/ui/card"

const CHART_COLORS = [
  "oklch(0.58 0.11 150)",
  "oklch(0.58 0.09 220)",
  "oklch(0.66 0.14 60)",
  "oklch(0.62 0.13 28)",
  "oklch(0.58 0.1 300)",
]

interface ClientPageProps {
  params: Promise<{ clientId: string }>
  searchParams: Promise<{ range?: string }>
}

type RangeKey = "7d" | "4w" | "3m" | "6m"

const RANGE_OPTIONS: Array<{
  key: RangeKey
  label: string
  title: string
  days: number
}> = [
  { key: "7d", label: "7D", title: "Last 7 days", days: 7 },
  { key: "4w", label: "4W", title: "Last 4 weeks", days: 28 },
  { key: "3m", label: "3M", title: "Last 3 months", days: 90 },
  { key: "6m", label: "6M", title: "Last 6 months", days: 180 },
]

export default async function ClientDetailPage({ params, searchParams }: ClientPageProps) {
  const { clientId } = await params
  const query = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const practitioner = await prisma.userProfile.findUnique({
    where: { id: user.id },
    select: { role: true },
  })
  if (!practitioner || practitioner.role !== "PRACTITIONER") redirect("/tool")

  const client = await prisma.userProfile.findUnique({
    where: { id: clientId, practitionerId: user.id },
    select: { id: true, name: true, email: true, createdAt: true },
  })
  if (!client) notFound()

  const thoughts = await prisma.thoughtEntry.findMany({
    where: { userId: clientId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      thought: true,
      automaticThought: true,
      pattern: true,
      emotion: true,
      coreBelief: true,
      balancedThought: true,
      situation: true,
      createdAt: true,
    },
  })

  const uniqueThoughts = dedupeExactThoughts(thoughts)

  const threads = await prisma.thread.findMany({
    where: { userId: clientId },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      id: true,
      situation: true,
      title: true,
      createdAt: true,
      _count: { select: { thoughts: true } },
    },
  })

  const totalReflections = uniqueThoughts.length
  const totalThreads = await prisma.thread.count({ where: { userId: clientId } })

  // ─── Patterns (deduplicated) ─────────────────────────────────────────────
  const patternCounts = countBy(uniqueThoughts, (t) => normalizeKey(t.pattern))
  const sortedPatterns = Object.entries(patternCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)

  // ─── Emotions ────────────────────────────────────────────────────────────
  const emotionCounts = countBy(uniqueThoughts, (t) => normalizeKey(t.emotion))
  const sortedEmotions = Object.entries(emotionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
  const topPatternOverall = sortedPatterns[0]
  const topEmotionOverall = sortedEmotions[0]
  const latestReflectionAt = uniqueThoughts[0]?.createdAt ?? null
  const emotionDonutData = sortedEmotions.slice(0, 4).map(([emotion, count], index) => ({
    label: cap(emotion),
    value: count,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }))

  // ─── Core beliefs ────────────────────────────────────────────────────────
  const beliefCounts = countBy(
    uniqueThoughts.filter((t) => !!t.coreBelief?.trim()),
    (t) => normalizeKey(t.coreBelief)
  )
  const sortedBeliefs = Object.entries(beliefCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
  const coreWound = sortedBeliefs[0]?.[0] ?? null
  const coreWoundCount = coreWound ? beliefCounts[coreWound] ?? 0 : 0
  const coreBeliefConfidence = getBeliefConfidence(coreWoundCount)
  const shouldShowDeeperBelief = coreWoundCount >= 3
  const coreWoundExample = coreWound
    ? selectRepresentativeThought(
        uniqueThoughts,
        (t) => normalizeKey(t.coreBelief) === coreWound
      )
    : null

  // ─── Pattern → emotion pairings ──────────────────────────────────────────
  const patternEmotionMap: Record<string, Record<string, number>> = {}
  for (const t of uniqueThoughts) {
    if (!t.pattern || !t.emotion) continue
    const p = normalizeKey(t.pattern)
    const e = normalizeKey(t.emotion)
    if (!patternEmotionMap[p]) patternEmotionMap[p] = {}
    patternEmotionMap[p][e] = (patternEmotionMap[p][e] ?? 0) + 1
  }
  const patternEmotionPairs = sortedPatterns
    .slice(0, 4)
    .map(([pattern, total]) => {
      const emotions = patternEmotionMap[pattern] ?? {}
      const top = Object.entries(emotions).sort(([, a], [, b]) => b - a)[0]
      if (!top) return null
      return { pattern, emotion: top[0], pct: Math.round((top[1] / total) * 100) }
    })
    .filter(Boolean) as { pattern: string; emotion: string; pct: number }[]

  // ─── Weekly activity (fixed) ──────────────────────────────────────────────
  const now = new Date()
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const weeksAgo = 7 - i
    const end = new Date(now)
    end.setDate(end.getDate() - weeksAgo * 7)
    end.setHours(0, 0, 0, 0)
    const start = new Date(end)
    start.setDate(start.getDate() - 7)
    return { start, end, count: 0, label: end.toLocaleDateString("en-US", { month: "short", day: "numeric" }) }
  })
  for (const t of uniqueThoughts) {
    const d = new Date(t.createdAt)
    const week = weeks.find((w) => d >= w.start && d < w.end)
    if (week) week.count++
  }
  const maxWeek = Math.max(...weeks.map((w) => w.count), 1)

  // ─── Session prep (range-aware) ────────────────────────────────────────────
  const selectedRange = RANGE_OPTIONS.find((option) => option.key === query.range) ?? RANGE_OPTIONS[0]
  const rangeStart = new Date()
  rangeStart.setDate(rangeStart.getDate() - selectedRange.days)
  const recentThoughts = uniqueThoughts.filter((t) => new Date(t.createdAt) >= rangeStart)
  const recentDayCount = new Set(
    recentThoughts.map((t) => new Date(t.createdAt).toISOString().slice(0, 10))
  ).size
  const recentPatternCounts = countBy(recentThoughts, (t) => normalizeKey(t.pattern))
  const recentTopPattern = Object.entries(recentPatternCounts).sort(([, a], [, b]) => b - a)[0]
  const recentEmotionCounts = countBy(recentThoughts, (t) => normalizeKey(t.emotion))
  const recentTopEmotion = Object.entries(recentEmotionCounts).sort(([, a], [, b]) => b - a)[0]
  const recentSample = selectRepresentativeThought(
    recentThoughts,
    (t) => normalizeKey(t.pattern) === (recentTopPattern?.[0] ?? topPatternOverall?.[0] ?? "")
  ) ?? recentThoughts[0]?.automaticThought ?? recentThoughts[0]?.thought ?? null
  const visiblePatterns = sortedPatterns.slice(0, 3)
  const hiddenPatternCount = Math.max(sortedPatterns.length - visiblePatterns.length, 0)
  const topPatternEvidence = topPatternOverall
    ? collectEvidence(uniqueThoughts, (t) => normalizeKey(t.pattern) === topPatternOverall[0])
    : []
  const topEmotionEvidence = topEmotionOverall
    ? collectEvidence(uniqueThoughts, (t) => normalizeKey(t.emotion) === topEmotionOverall[0])
    : []
  const topBeliefEvidence = coreWound
    ? collectEvidence(uniqueThoughts, (t) => normalizeKey(t.coreBelief) === coreWound)
    : []
  const emotionSummary = summarizeEmotions(uniqueThoughts)
  const situationalBelief = deriveSituationalBelief(recentTopPattern?.[0] ?? topPatternOverall?.[0] ?? null)
  const sessionFocus = buildSessionFocus({
    pattern: recentTopPattern?.[0] ?? topPatternOverall?.[0] ?? null,
    emotion: recentTopEmotion?.[0] ?? topEmotionOverall?.[0] ?? null,
    belief: situationalBelief,
  })
  const beliefReasoningBridge = buildBeliefReasoningBridge({
    pattern: recentTopPattern?.[0] ?? topPatternOverall?.[0] ?? null,
    belief: situationalBelief,
  })
  const impliedBeliefSupport = recentTopPattern ?? topPatternOverall ?? null
  const groupedRecentThreads = groupThreadsBySituation(threads)
  const shouldPromptDeeper =
    totalReflections < 6 ||
    !coreWound ||
    (coreWound ? beliefCounts[coreWound] < 3 : false)
  const visiblePairings = patternEmotionPairs.slice(0, 2)
  const hiddenPairingCount = Math.max(patternEmotionPairs.length - visiblePairings.length, 0)
  const visibleBeliefStack = sortedBeliefs.slice(0, 1)
  const hiddenBeliefCount = Math.max(sortedBeliefs.length - visibleBeliefStack.length, 0)
  const visibleGroupedThreads = groupedRecentThreads.slice(0, 3)
  const hiddenGroupedThreadCount = Math.max(groupedRecentThreads.length - visibleGroupedThreads.length, 0)

  return (
    <div
      className="min-h-screen"
      style={{
        background: [
          "radial-gradient(circle at top right, oklch(0.9 0.05 150 / 0.28), transparent 26%)",
          "radial-gradient(circle at top left, oklch(0.92 0.03 220 / 0.2), transparent 24%)",
          "oklch(0.977 0.008 88)",
        ].join(", "),
      }}
    >
      {/* Nav */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b border-border" style={{ background: "oklch(0.977 0.008 88 / 0.92)" }}>
        <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Dashboard
          </Link>
          <span className="font-display text-xl font-semibold text-foreground tracking-tight">
            ThoughtLens
          </span>
          <div className="w-24" />
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
          <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border bg-background px-3 py-1">
                  Client profile
                </span>
                <span className="rounded-full border border-border bg-background px-3 py-1">
                  Since {client.createdAt.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </span>
                {latestReflectionAt && (
                  <span className="rounded-full border border-border bg-background px-3 py-1">
                    Last reflection {formatRelativeDate(latestReflectionAt)}
                  </span>
                )}
              </div>
              <div>
                <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
                  {client.name ?? client.email ?? "Client"}
                </h1>
                {client.email && client.name && (
                  <p className="mt-1 text-sm text-muted-foreground">{client.email}</p>
                )}
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Structured reflections captured between sessions, summarized for clinical use
                </p>
              </div>
              <div className="grid max-w-md gap-3 sm:grid-cols-2">
                <StatCard label="Reflections" value={String(totalReflections)} />
                <StatCard label="Threads" value={String(totalThreads)} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Time range
                </span>
                {RANGE_OPTIONS.map((option) => {
                  const isActive = option.key === selectedRange.key
                  return (
                    <Link
                      key={option.key}
                      href={`/dashboard/clients/${client.id}?range=${option.key}`}
                      className="rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.2em] transition-colors"
                      style={{
                        borderColor: isActive ? "oklch(0.58 0.11 150 / 0.6)" : "oklch(0.88 0.012 88)",
                        background: isActive ? "oklch(0.93 0.025 150 / 0.5)" : "oklch(0.995 0.004 88 / 0.9)",
                        color: isActive ? "oklch(0.3 0.08 148)" : "oklch(0.52 0.018 248)",
                      }}
                    >
                      {option.label}
                    </Link>
                  )
                })}
              </div>
          </div>
        </Card>

        <InsightPanel
          eyebrow="Session bridge"
          title="Suggested session focus"
          description="A starting point for your next conversation."
          className="border-[1.5px]"
          panelStyle={{
            background:
              "linear-gradient(145deg, oklch(0.985 0.018 150 / 0.98) 0%, oklch(0.995 0.004 88 / 0.96) 100%)",
            boxShadow: "0 18px 46px oklch(0.46 0.12 152 / 0.08)",
          }}
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-2xl border border-border bg-background/85 px-5 py-5">
              <p className="text-sm leading-7 text-foreground">{sessionFocus.summary}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/85 px-5 py-5">
              <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Suggested question</p>
              <p className="mt-3 text-sm leading-7 text-foreground">&ldquo;{sessionFocus.question}&rdquo;</p>
            </div>
          </div>
          {beliefReasoningBridge && (
            <div className="mt-4 rounded-2xl border border-border bg-background/85 px-5 py-5">
              <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Reasoning bridge</p>
              <p className="mt-3 text-sm leading-7 text-foreground">{beliefReasoningBridge}</p>
            </div>
          )}
          <div className="mt-4 rounded-2xl border border-border bg-background/85 px-5 py-5">
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">You might explore</p>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-foreground md:grid-cols-2">
              {sessionFocus.explore.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
        </InsightPanel>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            {recentThoughts.length > 0 && (
              <InsightPanel
                eyebrow="Client summary"
                title={`Client summary (${selectedRange.title.toLowerCase()})`}
                description="A quick between-session read."
              >
                <div className="mb-4">
                  <span className="inline-flex rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium text-secondary-foreground">
                    Captured across {recentDayCount} day{recentDayCount === 1 ? "" : "s"} between sessions
                  </span>
                </div>
                {recentSample && (
                  <div className="rounded-2xl border border-border bg-background/80 px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                      Recent thought
                    </p>
                    <p className="mt-2 text-sm leading-6 text-foreground">&ldquo;{recentSample}&rdquo;</p>
                  </div>
                )}
                {(emotionSummary.primary || emotionSummary.secondary.length > 0) && (
                  <div className="mt-4 rounded-2xl border border-border bg-background/80 px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                      Emotion summary
                    </p>
                    {emotionSummary.primary && (
                      <p className="mt-2 text-sm leading-6 text-foreground">
                        Primary emotion: {cap(emotionSummary.primary)}
                      </p>
                    )}
                    {emotionSummary.secondary.length > 0 && (
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Secondary emotions: {emotionSummary.secondary.map(cap).join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </InsightPanel>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              {sortedPatterns.length > 0 && (
                <InsightPanel
                  eyebrow="Patterns"
                  title="Most frequent pattern observed"
                  description="Top themes across reflections."
                >
                  <div className="space-y-3">
                    {visiblePatterns.map(([pattern, count]) => {
                      const pct = Math.round((count / totalReflections) * 100)
                      return (
                        <MetricRow
                          key={pattern}
                          label={formatPattern(pattern)}
                          value={`${count}x`}
                          meta={`${pct}% of reflections`}
                          percent={pct}
                        />
                      )
                    })}
                  </div>
                  {hiddenPatternCount > 0 && (
                    <p className="mt-3 text-sm text-muted-foreground">+{hiddenPatternCount} more patterns</p>
                  )}
                  {topPatternOverall && (
                    <details className="mt-4 rounded-2xl border border-border bg-background/80">
                      <summary className="cursor-pointer list-none px-4 py-3 text-sm text-muted-foreground hover:text-foreground">
                        See examples behind this insight
                      </summary>
                      <div className="border-t border-border px-4 py-4">
                        <EvidenceList
                          label={`Observed in ${topPatternOverall[1]} reflections`}
                          items={topPatternEvidence}
                        />
                      </div>
                    </details>
                  )}
                </InsightPanel>
              )}
            </div>
          </div>
          <div className="space-y-6">
            {situationalBelief && (
              <InsightPanel
                eyebrow="Belief layering"
                title="Situational belief emerging from recent patterns"
                description="Grounded in repeated thought patterns before moving to any deeper interpretation."
              >
                <div className="rounded-2xl border border-border bg-background/80 px-4 py-4">
                  <p className="text-lg font-medium italic text-foreground">&ldquo;{situationalBelief}&rdquo;</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Implied across patterns: {formatPattern(impliedBeliefSupport?.[0] ?? recentTopPattern?.[0] ?? "")} appeared {impliedBeliefSupport?.[1] ?? 0} times.
                  </p>
                  {impliedBeliefSupport && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      This is a situational belief, not a deeper belief, because the strongest signal is repeated uncertainty and negative prediction.
                    </p>
                  )}
                  {beliefReasoningBridge && (
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {beliefReasoningBridge}
                    </p>
                  )}
                  {recentSample && (
                    <p className="mt-4 border-t border-border pt-4 text-sm leading-6 text-muted-foreground">
                      Example: &ldquo;{recentSample}&rdquo;
                    </p>
                  )}
                </div>
                {shouldShowDeeperBelief && coreWound && (
                  <div className="mt-4 rounded-2xl border border-border bg-background/80 px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                      {coreBeliefConfidence === "strong"
                        ? "Deeper belief"
                        : "Deeper belief (low confidence)"}
                    </p>
                    <p className="mt-3 text-lg font-medium italic text-foreground">
                      &ldquo;{formatBelief(coreWound)}&rdquo;
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Explicitly observed in {coreWoundCount} reflection{coreWoundCount === 1 ? "" : "s"}.
                    </p>
                    {coreWoundExample && (
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        Example: &ldquo;{coreWoundExample}&rdquo;
                      </p>
                    )}
                    <details className="mt-4 rounded-2xl border border-border bg-background/70">
                      <summary className="cursor-pointer list-none px-4 py-3 text-sm text-muted-foreground hover:text-foreground">
                        See examples behind this insight
                      </summary>
                      <div className="border-t border-border px-4 py-4">
                        <EvidenceList
                          label={`Observed in ${beliefCounts[coreWound]} reflections`}
                          items={topBeliefEvidence}
                        />
                      </div>
                    </details>
                  </div>
                )}
              </InsightPanel>
            )}
          </div>
        </div>

        <details className="group rounded-[24px] border border-border/80 bg-card/95">
          <summary className="cursor-pointer list-none px-5 py-4 md:px-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Explore deeper patterns and signals</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Includes: Emotion trends, Pattern to feeling links, Reflection momentum
                </p>
                {shouldPromptDeeper && (
                  <p className="mt-2 text-xs text-secondary-foreground">
                    Explore deeper patterns to validate this signal
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground md:text-right">
                Useful when exploring deeper client patterns
              </p>
            </div>
          </summary>
          <div className="grid grid-rows-[0fr] transition-all duration-300 ease-out group-open:grid-rows-[1fr]">
            <div className="overflow-hidden">
              <div className="space-y-6 border-t border-border px-5 py-5 md:px-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)]">
              <DeepInsightSection
                eyebrow="Emotion"
                title="Most common emotion reported"
                description="Observed across reflections."
                preview={topEmotionOverall ? `${cap(topEmotionOverall[0])} across ${topEmotionOverall[1]} reflections` : "No emotional data yet"}
              >
                <div className="flex items-center gap-5">
                  <DonutChart
                    data={emotionDonutData}
                    size={132}
                    thickness={16}
                    centerLabel={topEmotionOverall ? cap(topEmotionOverall[0]) : "None"}
                    centerValue={topEmotionOverall ? `${topEmotionOverall[1]}x` : ""}
                  />
                  <div className="flex-1 space-y-3">
                    {emotionDonutData.length > 0 ? (
                      emotionDonutData.map((item) => (
                        <LegendRow key={item.label} color={item.color} label={item.label} value={`${item.value}x`} />
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No emotional data yet.</p>
                    )}
                  </div>
                </div>
                {topEmotionOverall && (
                  <details className="mt-4 rounded-2xl border border-border bg-background/80">
                    <summary className="cursor-pointer list-none px-4 py-3 text-sm text-muted-foreground hover:text-foreground">
                      See examples behind this insight
                    </summary>
                    <div className="border-t border-border px-4 py-4">
                      <EvidenceList
                        label={`Observed in ${topEmotionOverall[1]} reflections`}
                        items={topEmotionEvidence}
                      />
                    </div>
                  </details>
                )}
              </DeepInsightSection>

              {patternEmotionPairs.length > 0 && (
                <DeepInsightSection
                  eyebrow="Pattern pairings"
                  title="Observed links between pattern and emotion"
                  description="Signals that may help shape follow-up conversations."
                  preview={`${visiblePairings.length} pairing${visiblePairings.length === 1 ? "" : "s"} shown${hiddenPairingCount > 0 ? `, +${hiddenPairingCount} more` : ""}`}
                >
                  <div className="space-y-3">
                    {visiblePairings.map(({ pattern, emotion, pct }, index) => (
                      <PairingCard
                        key={pattern}
                        pattern={formatPattern(pattern)}
                        emotion={cap(emotion)}
                        pct={pct}
                        color={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </div>
                </DeepInsightSection>
              )}
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)]">
              <DeepInsightSection
                eyebrow="Momentum"
                title="Reflection momentum"
                description="Observed over the last 8 weeks."
                preview="8-week reflection trend"
              >
                <div className="flex items-end gap-2 h-28">
                  {weeks.map((week, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-2">
                      <div className="text-[10px] text-muted-foreground">{week.count || ""}</div>
                      <div
                        className="w-full rounded-full transition-all"
                        style={{
                          height: week.count === 0
                            ? "6px"
                            : `${Math.max(10, Math.round((week.count / maxWeek) * 80))}px`,
                          background: week.count === 0
                            ? "oklch(0.9 0.012 88)"
                            : "linear-gradient(180deg, oklch(0.58 0.11 150 / 0.9) 0%, oklch(0.46 0.09 210 / 0.85) 100%)",
                        }}
                      />
                      <span className="text-[10px] text-muted-foreground/70">{week.label}</span>
                      </div>
                    ))}
                </div>
              </DeepInsightSection>

              {sortedBeliefs.length > 1 && (
                <DeepInsightSection
                  eyebrow="Belief stack"
                  title="Other possible recurring beliefs"
                  description="Observed signals that may become clearer with more reflections."
                  preview={`${visibleBeliefStack.length} belief shown${hiddenBeliefCount > 0 ? `, +${hiddenBeliefCount} more` : ""}`}
                >
                  <div className="space-y-3">
                    {visibleBeliefStack.map(([belief, count]) => (
                      <div
                        key={belief}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background/80 px-4 py-3"
                      >
                        <span className="text-sm italic text-foreground">&ldquo;{formatBelief(belief)}&rdquo;</span>
                        <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                          {count}x
                        </span>
                        </div>
                      ))}
                  </div>
                </DeepInsightSection>
              )}
            </div>

            <DeepInsightSection
              eyebrow="Threads"
              title="Grouped recent threads"
              description="Repeated situations grouped by normalized wording."
              preview={`${visibleGroupedThreads.length} grouped situation${visibleGroupedThreads.length === 1 ? "" : "s"} shown${hiddenGroupedThreadCount > 0 ? `, +${hiddenGroupedThreadCount} more` : ""}`}
            >
              {groupedRecentThreads.length === 0 ? (
                <p className="text-sm text-muted-foreground">No threads yet.</p>
              ) : (
                <div className="space-y-3">
                  {visibleGroupedThreads.map((group) => (
                    <div
                      key={group.key}
                      className="rounded-2xl border border-border bg-background/80 px-4 py-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <p className="text-sm leading-6 text-foreground">{group.label}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground sm:shrink-0">
                          <span>{group.threadCount} reflection{group.threadCount === 1 ? "" : "s"}</span>
                          <span className="hidden sm:inline">•</span>
                          <span>{formatRelative(group.latestAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DeepInsightSection>
              </div>
            </div>
          </div>
        </details>
      </main>
    </div>
  )
}

// ─── Components ───────────────────────────────────────────────────────────────

function InsightPanel({
  eyebrow,
  title,
  description,
  children,
  className,
  panelStyle,
}: {
  eyebrow: string
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  panelStyle?: CSSProperties
}) {
  return (
    <Card
      className={`rounded-[24px] border border-border/80 px-5 py-5 md:px-6 md:py-6 ${className ?? ""}`}
      style={{
        background: "linear-gradient(145deg, oklch(0.995 0.004 88 / 0.96) 0%, oklch(0.985 0.01 88 / 0.92) 100%)",
        ...panelStyle,
      }}
    >
      <div className="mb-4">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">{eyebrow}</p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
        {description && <p className="mt-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground/80">{description}</p>}
      </div>
      {children}
    </Card>
  )
}

function DeepInsightSection({
  eyebrow,
  title,
  description,
  preview,
  children,
}: {
  eyebrow: string
  title: string
  description?: string
  preview: string
  children: React.ReactNode
}) {
  return (
    <details className="group rounded-[24px] border border-border/80 bg-card/90">
      <summary className="cursor-pointer list-none px-5 py-4 md:px-6">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">{eyebrow}</p>
        <h3 className="mt-2 font-display text-xl font-semibold tracking-tight text-foreground">{title}</h3>
        {description && <p className="mt-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground/80">{description}</p>}
        <p className="mt-3 text-sm text-muted-foreground">{preview}</p>
      </summary>
      <div className="grid grid-rows-[0fr] transition-all duration-300 ease-out group-open:grid-rows-[1fr]">
        <div className="overflow-hidden">
          <div className="border-t border-border px-5 py-5 md:px-6">
            {children}
          </div>
        </div>
      </div>
    </details>
  )
}

function StatCard({
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

function MetricRow({
  label,
  value,
  percent,
  meta,
  color,
}: {
  label: string
  value: string
  percent: number
  meta?: string
  color?: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/90 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {meta && <p className="mt-1 text-xs text-muted-foreground">{meta}</p>}
        </div>
        <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">{value}</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{
            background: color ?? "oklch(0.5 0.11 150 / 0.7)",
            width: `${Math.max(percent, 6)}%`,
          }}
        />
      </div>
    </div>
  )
}

function PairingCard({
  pattern,
  emotion,
  pct,
  color,
}: {
  pattern: string
  emotion: string
  pct: number
  color: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/90 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{pattern}</p>
          <p className="mt-1 text-xs text-muted-foreground">Most often followed by {emotion}</p>
        </div>
        <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
          {pct}%
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-start gap-3">
        <span className="pt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Flow</span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="max-w-full rounded-full border border-border bg-background px-2.5 py-1 text-xs leading-5 text-foreground break-words">
            {pattern}
          </span>
          <span className="text-muted-foreground">→</span>
          <span
            className="max-w-full rounded-full border px-2.5 py-1 text-xs font-medium leading-5 break-words"
            style={{
              borderColor: color,
              background: "oklch(0.985 0.008 88)",
              color,
            }}
          >
            {emotion}
          </span>
        </div>
      </div>
    </div>
  )
}

function LegendRow({
  color,
  label,
  value,
}: {
  color: string
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color }} />
        <span className="truncate text-sm text-foreground">{label}</span>
      </div>
      <span className="text-xs text-muted-foreground">{value}</span>
    </div>
  )
}

function EvidenceList({
  label,
  items,
}: {
  label: string
  items: string[]
}) {
  if (!items.length) return null

  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-foreground">
        {items.map((item) => (
          <li key={item}>- &ldquo;{item}&rdquo;</li>
        ))}
      </ul>
    </div>
  )
}

function DonutChart({
  data,
  size,
  thickness,
  centerLabel,
  centerValue,
}: {
  data: Array<{ label: string; value: number; color: string }>
  size: number
  thickness: number
  centerLabel?: string
  centerValue?: string
}) {
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  const total = data.reduce((sum, item) => sum + item.value, 0)
  let cumulative = 0

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="oklch(0.9 0.012 88)"
          strokeWidth={thickness}
        />
        {total > 0 &&
          data.map((item) => {
            const fraction = item.value / total
            const dash = fraction * circumference
            const offset = circumference - cumulative
            cumulative += dash
            return (
              <circle
                key={item.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth={thickness}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={offset}
              />
            )
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {centerValue && <span className="text-xl font-semibold tracking-tight text-foreground">{centerValue}</span>}
        {centerLabel && <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{centerLabel}</span>}
      </div>
    </div>
  )
}

function formatRelativeDate(date: Date): string {
  const diff = Date.now() - date.getTime()
  const days = Math.floor(diff / 86400000)
  if (days <= 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return `${Math.floor(days / 30)} months ago`
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countBy<T>(items: T[], key: (item: T) => string | null | undefined): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const k = key(item)
    if (!k) return acc
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})
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

function normalizeKey(value: string | null | undefined): string {
  if (!value) return ""
  const k = value.trim().toLowerCase().replace(/[\s_-]+/g, "_")
  return k || ""
}

function formatPattern(pattern: string): string {
  return pattern.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
}

function formatBelief(belief: string): string {
  return belief.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function collectEvidence(
  thoughts: Array<{
    thought: string
    automaticThought: string | null
    pattern: string | null
    emotion: string | null
    coreBelief: string | null
  }>,
  matcher: (thought: {
    thought: string
    automaticThought: string | null
    pattern: string | null
    emotion: string | null
    coreBelief: string | null
  }) => boolean
): string[] {
  const seen = new Set<string>()
  const items: string[] = []

  for (const thought of thoughts) {
    if (!matcher(thought)) continue
    const text = (thought.automaticThought ?? thought.thought).trim()
    if (!text || seen.has(text)) continue
    seen.add(text)
    items.push(text)
    if (items.length === 3) break
  }

  return items
}

function selectRepresentativeThought<
  T extends {
    thought: string
    automaticThought: string | null
    createdAt: Date
  }
>(thoughts: T[], matcher: (thought: T) => boolean): string | null {
  const matches = thoughts.filter(matcher)
  if (!matches.length) return null

  const ranked = matches
    .map((thought) => ({
      text: (thought.automaticThought ?? thought.thought).trim(),
      createdAt: thought.createdAt,
    }))
    .filter((thought) => thought.text.length > 0)
    .sort((a, b) => {
      const lengthDelta = Math.abs(a.text.length - 90) - Math.abs(b.text.length - 90)
      if (lengthDelta !== 0) return lengthDelta
      return b.createdAt.getTime() - a.createdAt.getTime()
    })

  return ranked[0]?.text ?? null
}

function groupThreadsBySituation(
  threads: Array<{
    id: string
    situation: string | null
    title: string | null
    createdAt: Date
    _count: { thoughts: number }
  }>
) {
  const groups = new Map<string, {
    key: string
    label: string
    threadCount: number
    latestAt: Date
  }>()

  for (const thread of threads) {
    const label = (thread.situation ?? thread.title ?? "Untitled").trim()
    const key = normalizeKey(label)
    const existing = groups.get(key)

    if (existing) {
      existing.threadCount += 1
      if (thread.createdAt > existing.latestAt) {
        existing.latestAt = thread.createdAt
      }
      continue
    }

    groups.set(key, {
      key,
      label,
      threadCount: 1,
      latestAt: thread.createdAt,
    })
  }

  return Array.from(groups.values()).sort((a, b) => b.latestAt.getTime() - a.latestAt.getTime())
}

function buildSessionFocus({
  pattern,
  emotion,
  belief,
}: {
  pattern: string | null
  emotion: string | null
  belief: string | null
}) {
  const normalizedPattern = normalizeKey(pattern)

  if (normalizedPattern === "fortune_telling" || normalizedPattern === "uncertainty_intolerance") {
    return {
      summary: `Repeated uncertainty about future outcomes${emotion ? `, often linked with ${emotion}.` : "."}`,
      explore: [
        "Fear of negative consequences",
        "Need for certainty before feeling safe",
      ],
      question: "What makes this outcome feel likely to you?",
    }
  }

  if (normalizedPattern === "mind_reading") {
    return {
      summary: "Client seems to revisit worries about how others may be seeing or judging them.",
      explore: [
        "Sensitivity to other people's reactions",
        "What silence or ambiguity gets taken to mean",
      ],
      question: "What are you taking their response to mean about you?",
    }
  }

  if (normalizedPattern === "catastrophizing") {
    return {
      summary: "Client appears to jump quickly from uncertainty to the most painful outcome.",
      explore: [
        "How quickly the mind moves to worst-case scenarios",
        "What feels especially hard to tolerate in the unknown",
      ],
      question: "When your mind jumps ahead, what outcome feels hardest to sit with?",
    }
  }

  return {
    summary: `Client is showing a recurring theme${belief ? ` around "${formatBelief(belief)}"` : ""}${emotion ? `, often with ${emotion}.` : "."}`,
    explore: [
      "What keeps bringing this theme back between sessions",
      "What the thought may be protecting them from feeling",
    ],
    question: "What feels most true to you when this thought shows up?",
  }
}

function getBeliefConfidence(count: number): "strong" | "low" {
  return count >= 5 ? "strong" : "low"
}

function deriveSituationalBelief(pattern: string | null) {
  const normalizedPattern = normalizeKey(pattern)

  if (normalizedPattern === "fortune_telling" || normalizedPattern === "uncertainty_intolerance") {
    return "I may not get the outcome I want"
  }

  if (normalizedPattern === "catastrophizing") {
    return "This may turn out badly"
  }

  if (normalizedPattern === "mind_reading") {
    return "They may be seeing this negatively"
  }

  if (normalizedPattern === "self_criticism") {
    return "This may mean I did something wrong"
  }

  if (normalizedPattern === "overgeneralization") {
    return "This setback may say something bigger about how things go for me"
  }

  return null
}

function buildBeliefReasoningBridge({
  pattern,
  belief,
}: {
  pattern: string | null
  belief: string | null
}) {
  const normalizedPattern = normalizeKey(pattern)
  if (!belief) return null

  if (normalizedPattern === "fortune_telling" || normalizedPattern === "uncertainty_intolerance") {
    return "Repeated negative predictions in uncertain situations may be shaping a situational belief like this."
  }

  if (normalizedPattern === "mind_reading") {
    return "Repeated assumptions about how others may be seeing them may be shaping a situational belief like this."
  }

  if (normalizedPattern === "catastrophizing") {
    return "Linking uncertainty to the most painful possible outcome may be shaping a situational belief like this."
  }

  if (normalizedPattern === "self_criticism") {
    return "Repeated self-judgment after difficult moments may be shaping a situational belief like this."
  }

  return `This belief may be forming through repeated ${formatPattern(
    normalizedPattern || pattern
  ).toLowerCase()} across reflections.`
}

function summarizeEmotions(
  thoughts: Array<{ emotion: string | null | undefined }>
) {
  const counts = countBy(thoughts, (thought) => normalizeEmotionCategory(thought.emotion))
  const entries = Object.entries(counts).sort(([, a], [, b]) => b - a)

  return {
    primary: entries[0]?.[0] ?? null,
    secondary: entries.slice(1, 3).map(([emotion]) => emotion).filter(Boolean),
  }
}

function normalizeEmotionCategory(emotion: string | null | undefined) {
  const normalized = normalizeKey(emotion)
  if (!normalized) return ""
  if (normalized.includes("anx")) return "anxiety"
  if (normalized.includes("sad") || normalized.includes("empty") || normalized.includes("hopeless")) {
    return "sadness"
  }
  if (normalized.includes("disappoint") || normalized.includes("frustrat")) {
    return "disappointment"
  }
  return ""
}
