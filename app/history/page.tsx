import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { BrandLogo } from "@/components/brand-logo"
import { PractitionerCalendar, type CalendarThought } from "@/components/practitioner-calendar"

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const rawThoughts = await prisma.thoughtEntry.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      thought: true,
      automaticThought: true,
      pattern: true,
      patternExplanation: true,
      emotion: true,
      situation: true,
      story: true,
      reflectionQuestion: true,
      balancedThought: true,
      createdAt: true,
    },
  })

  const thoughts: CalendarThought[] = dedupeExactThoughts(rawThoughts).map((t) => ({
    id: t.id,
    thought: t.thought,
    automaticThought: t.automaticThought ?? null,
    pattern: t.pattern ?? null,
    patternExplanation: t.patternExplanation ?? null,
    emotion: t.emotion ?? null,
    situation: t.situation ?? null,
    story: t.story ?? null,
    reflectionQuestion: t.reflectionQuestion ?? null,
    balancedThought: t.balancedThought ?? null,
    createdAt: t.createdAt.toISOString(),
  }))

  const totalReflections = thoughts.length
  const latestReflection = rawThoughts[0]?.createdAt ?? null

  const patternCounts: Record<string, number> = {}
  for (const t of thoughts) {
    if (t.pattern) {
      const k = t.pattern.toLowerCase()
      patternCounts[k] = (patternCounts[k] ?? 0) + 1
    }
  }
  const topPattern = Object.entries(patternCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null

  return (
    <div
      className="min-h-screen"
      style={{ background: "oklch(0.977 0.008 88)" }}
    >
      {/* Nav */}
      <header
        className="sticky top-0 z-50 border-b border-border/55 backdrop-blur-md"
        style={{ background: "oklch(0.982 0.007 88 / 0.9)" }}
      >
        <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/tool"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Tool
          </Link>
          <BrandLogo size="sm" />
          <Link
            href="/tool"
            className="text-sm font-medium px-4 py-1.5 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            + New
          </Link>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8 md:px-6 md:py-10 space-y-6">

        {/* Page header */}
        <div className="space-y-1">
          <h1 className="font-display text-4xl font-medium tracking-[-0.02em] text-foreground md:text-5xl">
            Your reflections
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Every thought you explored — what pattern showed up, what you were feeling.
          </p>
        </div>

        {totalReflections === 0 ? (
          <div
            className="rounded-[24px] border border-border/55 px-6 py-16 text-center"
            style={{ background: "oklch(0.993 0.004 88 / 0.82)" }}
          >
            <p className="text-sm text-muted-foreground mb-2">No reflections yet</p>
            <p className="text-xs text-muted-foreground/60 mb-6 max-w-xs mx-auto">
              Your thoughts and patterns will appear here after your first session.
            </p>
            <Link
              href="/tool"
              className="text-sm font-medium px-5 py-2.5 rounded-xl bg-foreground text-background hover:opacity-90 transition-opacity"
            >
              Start your first reflection
            </Link>
          </div>
        ) : (
          <>
            {/* Summary strip */}
            <div className="grid grid-cols-3 gap-3 max-w-lg">
              <SummaryChip label="Reflections" value={String(totalReflections)} />
              <SummaryChip
                label="Top pattern"
                value={topPattern ? formatPattern(topPattern) : "—"}
              />
              <SummaryChip
                label="Last session"
                value={latestReflection ? formatRelative(latestReflection) : "—"}
              />
            </div>

            {/* Calendar — full width card */}
            <div
              className="rounded-[24px] border border-border/55 px-6 py-6 md:px-8 md:py-8"
              style={{ background: "oklch(0.993 0.004 88 / 0.82)" }}
            >
              <PractitionerCalendar thoughts={thoughts} />
            </div>
          </>
        )}
      </main>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-2xl border border-border/55 px-4 py-3"
      style={{
        background: "oklch(0.993 0.004 88 / 0.82)",
        boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.5)",
      }}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
        {label}
      </p>
      <p className="mt-1.5 text-sm font-medium text-foreground leading-snug">
        {value}
      </p>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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
    .replace(/self_criticism/g, "self-criticism")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
}

function dedupeExactThoughts<T extends { thought: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  const unique: T[] = []
  for (const item of items) {
    const normalized = (item.thought ?? "").trim().replace(/\s+/g, " ")
    if (!normalized) { unique.push(item); continue }
    if (seen.has(normalized)) continue
    seen.add(normalized)
    unique.push(item)
  }
  return unique
}
