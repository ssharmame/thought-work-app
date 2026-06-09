import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { BrandLogo } from "@/components/brand-logo"
import {
  generatePractitionerSessionFocus,
  generatePractitionerStructuredBelief,
} from "@/lib/ai"
import { PractitionerCalendar, type CalendarThought } from "@/components/practitioner-calendar"

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

  const totalReflections = uniqueThoughts.length
  const activeDays = new Set(
    uniqueThoughts.map((t) => new Date(t.createdAt).toISOString().slice(0, 10))
  ).size
  const latestReflectionAt = uniqueThoughts[0]?.createdAt ?? null

  // ─── Patterns ───────────────────────────────────────────────────────────────
  const patternCounts = countBy(uniqueThoughts, (t) => normalizeKey(t.pattern))
  const sortedPatterns = Object.entries(patternCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
  const topPatternOverall = sortedPatterns[0] ?? null

  // ─── Emotions ────────────────────────────────────────────────────────────────
  const emotionCounts = countBy(uniqueThoughts, (t) => normalizeKey(t.emotion))
  const sortedEmotions = Object.entries(emotionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
  const topEmotionOverall = sortedEmotions[0] ?? null

  // ─── Core beliefs ────────────────────────────────────────────────────────────
  const beliefCounts = countBy(
    uniqueThoughts.filter((t) => !!t.coreBelief?.trim()),
    (t) => normalizeKey(t.coreBelief)
  )
  const sortedBeliefs = Object.entries(beliefCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  // ─── Session prep ─────────────────────────────────────────────────────────────
  const topPatternForFocus = topPatternOverall?.[0] ?? null
  const topPatternCount = topPatternOverall?.[1] ?? 0
  const topEmotionForFocus = topEmotionOverall?.[0] ?? null
  const situationalBelief = deriveSituationalBelief(topPatternForFocus)
  const recentSample = selectRepresentativeThought(
    uniqueThoughts,
    (t) => normalizeKey(t.pattern) === normalizeKey(topPatternForFocus)
  ) ?? uniqueThoughts[0]?.automaticThought ?? uniqueThoughts[0]?.thought ?? null
  const sessionFocusEvidence = collectEvidence(
    uniqueThoughts,
    (t) => normalizeKey(t.pattern) === normalizeKey(topPatternForFocus)
  )
  const beliefEvidence = sessionFocusEvidence
  const beliefSignalState = getBeliefSignalState(topPatternCount)

  const fallbackSessionFocus = buildSessionFocus({
    pattern: topPatternForFocus,
    emotion: topEmotionForFocus,
    belief: situationalBelief,
  })
  const fallbackStructuredBelief = buildStructuredBelief({
    pattern: topPatternForFocus,
    patternCount: topPatternCount,
    situationalBelief,
    example: recentSample,
  })

  const [sessionFocus, structuredBelief] = await Promise.all([
    generatePractitionerSessionFocus({
      pattern: topPatternForFocus,
      emotion: topEmotionForFocus,
      belief: situationalBelief,
      recentSample,
      evidence: sessionFocusEvidence,
      rangeLabel: "All reflections",
      reflectionCount: uniqueThoughts.length,
    }).catch(() => fallbackSessionFocus),
    beliefSignalState === "insufficient"
      ? Promise.resolve(null)
      : generatePractitionerStructuredBelief({
          pattern: topPatternForFocus,
          patternCount: topPatternCount,
          emotion: topEmotionForFocus,
          recentSample,
          evidence: beliefEvidence,
        }).catch(() => fallbackStructuredBelief),
  ])

  // ─── Serialise thoughts for calendar ─────────────────────────────────────────
  const calendarThoughts: CalendarThought[] = uniqueThoughts.map((t) => ({
    id: t.id,
    thought: t.thought,
    automaticThought: t.automaticThought,
    pattern: t.pattern,
    emotion: t.emotion,
    createdAt: t.createdAt.toISOString(),
  }))

  // ─── Pattern → emotion pairings (for deeper signals) ─────────────────────────
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
      const top = Object.entries(patternEmotionMap[pattern] ?? {}).sort(([, a], [, b]) => b - a)[0]
      if (!top) return null
      return { pattern, emotion: top[0], pct: Math.round((top[1] / total) * 100) }
    })
    .filter(Boolean) as { pattern: string; emotion: string; pct: number }[]

  const topPatternEvidence = topPatternOverall
    ? collectEvidence(uniqueThoughts, (t) => normalizeKey(t.pattern) === topPatternOverall[0])
    : []

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.977 0.008 88)" }}>
      {/* Nav */}
      <header
        className="sticky top-0 z-50 border-b border-border/60 backdrop-blur-md"
        style={{ background: "oklch(0.977 0.008 88 / 0.92)" }}
      >
        <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 md:px-6">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Dashboard
          </Link>
          <BrandLogo size="sm" />
          <div className="w-24" />
        </nav>
      </header>

      <main className="mx-auto max-w-5xl space-y-12 px-5 py-10 md:px-6 md:py-14">

        {/* ── Client header ─────────────────────────────────────────────────── */}
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/70">
            Client profile
          </p>
          <h1 className="font-display text-4xl font-medium tracking-[-0.02em] text-foreground md:text-5xl">
            {client.name ?? client.email ?? "Client"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {client.email && client.name && <span>{client.email}</span>}
            {client.email && client.name && <span className="text-border">·</span>}
            <span>
              Since{" "}
              {client.createdAt.toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })}
            </span>
            {latestReflectionAt && (
              <>
                <span className="text-border">·</span>
                <span>Last reflection {formatRelativeDate(latestReflectionAt)}</span>
              </>
            )}
          </div>
        </div>

        <div className="border-t border-border/50" />

        {/* ── Opening line ──────────────────────────────────────────────────── */}
        <div>
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/70">
            How you might open today
          </p>
          <blockquote
            className="border-l-2 pl-5"
            style={{ borderColor: "oklch(0.58 0.11 150)" }}
          >
            <p className="font-display text-xl font-medium italic leading-relaxed tracking-[-0.01em] text-foreground md:text-2xl">
              &ldquo;{sessionFocus.opening}&rdquo;
            </p>
          </blockquote>
          <p className="mt-4 max-w-2xl pl-5 text-sm leading-7 text-muted-foreground">
            {sessionFocus.whyItMatters}
          </p>
        </div>

        <div className="border-t border-border/50" />

        {/* ── Calendar ──────────────────────────────────────────────────────── */}
        <div>
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/70">
            Reflection activity
          </p>
          {totalReflections === 0 ? (
            <p className="text-sm text-muted-foreground">No reflections captured yet.</p>
          ) : (
            <div
              className="rounded-[24px] border border-border/60 px-5 py-5 md:px-6 md:py-6"
              style={{ background: "oklch(0.993 0.005 88 / 0.85)" }}
            >
              <PractitionerCalendar thoughts={calendarThoughts} />
            </div>
          )}
        </div>

        {/* ── Summary strip ─────────────────────────────────────────────────── */}
        {totalReflections > 0 && (
          <div className="flex flex-wrap gap-3">
            {topPatternOverall && (
              <SummaryChip
                label="Top pattern"
                value={formatPattern(topPatternOverall[0])}
                count={topPatternOverall[1]}
              />
            )}
            {topEmotionOverall && (
              <SummaryChip
                label="Top emotion"
                value={cap(topEmotionOverall[0])}
                count={topEmotionOverall[1]}
              />
            )}
            <SummaryChip label="Active days" value={String(activeDays)} />
            <SummaryChip label="Reflections" value={String(totalReflections)} />
          </div>
        )}

        {/* ── Deeper signals (collapsible) ──────────────────────────────────── */}
        {totalReflections >= 3 && (
          <details className="group">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border/50" />
                <span className="select-none rounded-full border border-border/70 bg-background px-4 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
                  <span className="group-open:hidden">▾ Deeper signals</span>
                  <span className="hidden group-open:inline">▴ Collapse</span>
                </span>
                <div className="h-px flex-1 bg-border/50" />
              </div>
            </summary>

            <div className="mt-8 space-y-10">

              {/* Belief hypothesis */}
              {structuredBelief && (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/70">
                    Emerging belief
                  </p>
                  <p
                    className="font-display text-2xl font-medium italic tracking-[-0.015em] text-foreground"
                    style={{ color: "oklch(0.3 0.08 150)" }}
                  >
                    &ldquo;{structuredBelief.belief}&rdquo;
                  </p>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                    {structuredBelief.reasoning}
                  </p>
                  {structuredBelief.example && (
                    <p className="mt-3 text-sm italic text-muted-foreground">
                      Client&rsquo;s words: &ldquo;{structuredBelief.example}&rdquo;
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground/60">{structuredBelief.alternative}</p>
                </div>
              )}

              {/* Pattern → emotion pairings */}
              {patternEmotionPairs.length > 0 && (
                <div>
                  <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/70">
                    Pattern links
                  </p>
                  <div className="space-y-2">
                    {patternEmotionPairs.map(({ pattern, emotion, pct }) => (
                      <div key={pattern} className="flex items-center gap-3 text-sm">
                        <span className="w-40 shrink-0 font-medium text-foreground">
                          {formatPattern(pattern)}
                        </span>
                        <span className="text-muted-foreground/50">→</span>
                        <span className="text-muted-foreground">{cap(emotion)}</span>
                        <span className="ml-auto text-xs text-muted-foreground/50">{pct}% of the time</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All patterns */}
              {sortedPatterns.length > 0 && (
                <div>
                  <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/70">
                    All patterns
                  </p>
                  <div className="space-y-3">
                    {sortedPatterns.map(([pattern, count]) => {
                      const pct = Math.round((count / totalReflections) * 100)
                      return (
                        <div key={pattern} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-foreground">{formatPattern(pattern)}</span>
                            <span className="text-xs text-muted-foreground">
                              {count}x · {pct}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-border/50">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max(pct, 4)}%`,
                                background: "oklch(0.56 0.1 150 / 0.65)",
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {topPatternOverall && topPatternEvidence.length > 0 && (
                    <div className="mt-5">
                      <p className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground/70">
                        Client&rsquo;s own words ({formatPattern(topPatternOverall[0])})
                      </p>
                      <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                        {topPatternEvidence.map((item) => (
                          <li key={item} className="italic">&ldquo;{item}&rdquo;</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Session focus extras */}
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/70">
                  Also consider asking
                </p>
                <p className="text-sm italic text-foreground">
                  &ldquo;{sessionFocus.question}&rdquo;
                </p>
                {sessionFocus.explore?.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {sessionFocus.explore.map((item: string) => (
                      <li key={item}>— {item}</li>
                    ))}
                  </ul>
                )}
              </div>

            </div>
          </details>
        )}

      </main>
    </div>
  )
}

// ─── Components ───────────────────────────────────────────────────────────────

function SummaryChip({
  label,
  value,
  count,
}: {
  label: string
  value: string
  count?: number
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/60">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-sm font-medium text-foreground">{value}</span>
        {count !== undefined && (
          <span className="text-xs text-muted-foreground/60">{count}×</span>
        )}
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countBy<T>(
  items: T[],
  key: (item: T) => string | null | undefined
): Record<string, number> {
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

function dedupeExactThoughts<T extends { thought: string | null }>(items: T[]): T[] {
  const seen = new Set<string>()
  const unique: T[] = []
  for (const item of items) {
    const normalized = normalizeExactThoughtText(item.thought)
    if (!normalized) { unique.push(item); continue }
    if (seen.has(normalized)) continue
    seen.add(normalized)
    unique.push(item)
  }
  return unique
}

function normalizeKey(value: string | null | undefined): string {
  if (!value) return ""
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "_")
}

function formatPattern(pattern: string): string {
  return pattern.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
}

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""
}

function formatRelativeDate(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / 86400000)
  if (days <= 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return `${Math.floor(days / 30)} months ago`
}

function collectEvidence(
  thoughts: Array<{
    thought: string
    automaticThought: string | null
    pattern: string | null
    emotion: string | null
    coreBelief: string | null
  }>,
  matcher: (t: {
    thought: string
    automaticThought: string | null
    pattern: string | null
    emotion: string | null
    coreBelief: string | null
  }) => boolean
): string[] {
  const seen = new Set<string>()
  const items: string[] = []
  for (const t of thoughts) {
    if (!matcher(t)) continue
    const text = (t.automaticThought ?? t.thought).trim()
    if (!text || seen.has(text)) continue
    seen.add(text)
    items.push(text)
    if (items.length === 3) break
  }
  return items
}

function selectRepresentativeThought<
  T extends { thought: string; automaticThought: string | null; createdAt: Date }
>(thoughts: T[], matcher: (t: T) => boolean): string | null {
  const matches = thoughts.filter(matcher)
  if (!matches.length) return null
  const ranked = matches
    .map((t) => ({ text: (t.automaticThought ?? t.thought).trim(), createdAt: t.createdAt }))
    .filter((t) => t.text.length > 0)
    .sort((a, b) => Math.abs(a.text.length - 90) - Math.abs(b.text.length - 90))
  return ranked[0]?.text ?? null
}

type StructuredBelief = {
  belief: string
  observedAcrossPatterns: { pattern: string; count: number }
  beliefType: "Situational"
  confidence: "Low" | "Medium" | "High"
  whyThisLevel: string
  reasoning: string
  alternative: string
  example: string | null
}

type BeliefSignalState = "insufficient" | "emerging" | "supported"

function getBeliefSignalState(count: number): BeliefSignalState {
  if (count < 3) return "insufficient"
  if (count < 5) return "emerging"
  return "supported"
}

function buildStructuredBelief({
  pattern,
  patternCount,
  situationalBelief,
  example,
}: {
  pattern: string | null
  patternCount: number
  situationalBelief: string | null
  example: string | null
}): StructuredBelief | null {
  if (!situationalBelief || !pattern) return null
  const np = normalizeKey(pattern)
  const base = {
    observedAcrossPatterns: { pattern: formatPattern(pattern), count: patternCount },
    beliefType: "Situational" as const,
    confidence: "Medium" as const,
    example,
  }
  if (np === "fortune_telling" || np === "uncertainty_intolerance") {
    return { ...base, belief: situationalBelief, whyThisLevel: "Repeated uncertainty and negative prediction, not stable identity-level conclusions", reasoning: "Repeated negative predictions across uncertain situations appear to be forming this expectation", alternative: "This may also reflect a temporary response to prolonged uncertainty rather than a stable belief" }
  }
  if (np === "catastrophizing") {
    return { ...base, belief: situationalBelief, whyThisLevel: "Situational catastrophizing rather than a fixed identity-level belief", reasoning: "Linking uncertainty to worst-case outcomes repeatedly may be forming this expectation", alternative: "This may reflect a stress response to specific life circumstances rather than a core belief" }
  }
  if (np === "mind_reading") {
    return { ...base, belief: situationalBelief, whyThisLevel: "Based on repeated assumptions about others' views, not a stable self-concept", reasoning: "Repeated assumptions about how others perceive them may be forming this expectation", alternative: "This may also reflect a heightened need for social approval in a specific period, not a permanent belief" }
  }
  if (np === "self_criticism") {
    return { ...base, belief: situationalBelief, whyThisLevel: "Repeated self-judgment observed, though not yet enough evidence for a deeper core belief", reasoning: "Repeated self-critical thoughts after difficult moments may be forming this expectation", alternative: "This may reflect a response to a specific setback rather than a fixed self-view" }
  }
  return { ...base, confidence: "Low", belief: situationalBelief, whyThisLevel: "Insufficient evidence for a more confident assessment", reasoning: `Repeated ${formatPattern(pattern).toLowerCase()} across reflections may be forming this expectation`, alternative: "This may reflect a temporary response to recent events rather than a stable pattern" }
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
  const np = normalizeKey(pattern)
  if (np === "fortune_telling" || np === "uncertainty_intolerance") {
    return { summary: `Repeated uncertainty about future outcomes${emotion ? `, often alongside ${emotion}` : ""}.`, opening: "I noticed a pattern of uncertainty and predicting negative outcomes recently. Does that feel accurate to you this week?", whyItMatters: "This pattern is strongly linked with anxiety and may be maintaining distress between sessions.", explore: ["Fear of negative consequences", "Need for certainty before feeling safe"], question: "What makes this outcome feel likely to you?" }
  }
  if (np === "mind_reading") {
    return { summary: "Client has been revisiting worries about how others may be seeing or judging them.", opening: "I noticed you've been thinking quite a bit about how others might be seeing you. Does that resonate with how this week felt?", whyItMatters: "Sensitivity to others' judgments can sustain anxiety and keep the client in a heightened state between sessions.", explore: ["Sensitivity to other people's reactions", "What silence or ambiguity gets taken to mean"], question: "What are you taking their response to mean about you?" }
  }
  if (np === "catastrophizing") {
    return { summary: "Client appears to jump quickly from uncertainty to the most painful outcome.", opening: "I noticed your mind has been jumping to worst-case outcomes quite a bit. Does that feel familiar this week?", whyItMatters: "Catastrophizing can amplify distress and make difficult situations feel unmanageable before they've fully played out.", explore: ["How quickly the mind moves to worst-case scenarios", "What feels especially hard to tolerate in the unknown"], question: "When your mind jumps ahead, what outcome feels hardest to sit with?" }
  }
  if (np === "self_criticism") {
    return { summary: `Client is showing a recurring theme of self-judgment${emotion ? `, often alongside ${emotion}` : ""}.`, opening: "I noticed some patterns of self-criticism in your reflections this week. Does that feel accurate?", whyItMatters: "Repeated self-criticism can reinforce low self-esteem and make it harder to take action or ask for support.", explore: ["What keeps bringing this theme back between sessions", "What the thought may be protecting them from feeling"], question: "What feels most true to you when this thought shows up?" }
  }
  return {
    summary: `Client is showing a recurring theme${belief ? ` around "${belief}"` : ""}${emotion ? `, often alongside ${emotion}` : ""}.`,
    opening: "I noticed some recurring themes in your reflections. Does that feel like something worth exploring together today?",
    whyItMatters: "Recurring thought patterns between sessions often point to the areas where a client is most ready to grow.",
    explore: ["What keeps bringing this theme back", "What the thought may be protecting them from feeling"],
    question: "What feels most true to you when this thought shows up?",
  }
}

function deriveSituationalBelief(pattern: string | null) {
  const np = normalizeKey(pattern)
  if (np === "fortune_telling" || np === "uncertainty_intolerance") return "I may not get the outcome I want"
  if (np === "catastrophizing") return "This may turn out badly"
  if (np === "mind_reading") return "They may be seeing this negatively"
  if (np === "self_criticism") return "This may mean I did something wrong"
  if (np === "overgeneralization") return "This setback may say something bigger about how things go for me"
  return null
}
