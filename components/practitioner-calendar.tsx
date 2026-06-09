"use client"

import { useState, useMemo } from "react"
import {
  Eye,
  AlertTriangle,
  Frown,
  Telescope,
  HelpCircle,
  type LucideIcon,
} from "lucide-react"

export interface CalendarThought {
  id: string
  thought: string
  automaticThought: string | null
  pattern: string | null
  emotion: string | null
  createdAt: string
  // Optional extended fields — shown in full drill-down when present
  situation?: string | null
  story?: string | null
  patternExplanation?: string | null
  reflectionQuestion?: string | null
  balancedThought?: string | null
}

interface Props {
  thoughts: CalendarThought[]
}

function formatPattern(p: string) {
  return p.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
}
function cap(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""
}

// ── Pattern → icon shape ──────────────────────────────────────────────────────
function getPatternIcon(pattern: string | null): LucideIcon {
  if (!pattern) return HelpCircle
  const p = pattern.toLowerCase()
  if (p.includes("mind_read") || p.includes("mind read")) return Eye
  if (p.includes("catastroph"))                             return AlertTriangle
  if (p.includes("self_crit")  || p.includes("self crit")) return Frown
  if (p.includes("fortune")    || p.includes("predict"))   return Telescope
  return HelpCircle
}

// ── Emotion → icon color ──────────────────────────────────────────────────────
function getEmotionColor(emotion: string | null): string {
  if (!emotion) return "oklch(0.62 0.04 248)"
  const e = emotion.toLowerCase()
  if (e.includes("anx") || e.includes("fear") || e.includes("worry") || e.includes("nervou"))
    return "oklch(0.62 0.14 55)"    // amber  — anxiety / fear
  if (e.includes("sad") || e.includes("empty") || e.includes("hopeless") || e.includes("griev"))
    return "oklch(0.50 0.12 225)"   // blue   — sadness
  if (e.includes("anger") || e.includes("frustrat") || e.includes("annoy") || e.includes("rage"))
    return "oklch(0.56 0.16 22)"    // red    — anger
  if (e.includes("guilt") || e.includes("shame") || e.includes("disappoint") || e.includes("embarrass"))
    return "oklch(0.50 0.13 300)"   // purple — guilt / shame
  return "oklch(0.50 0.1 150)"      // green  — other
}

// ── Dominant value for a day ──────────────────────────────────────────────────
function dominant(values: (string | null)[]): string | null {
  const counts: Record<string, number> = {}
  for (const v of values) {
    if (!v) continue
    counts[v] = (counts[v] ?? 0) + 1
  }
  return Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null
}

// ── Legends ───────────────────────────────────────────────────────────────────
const PATTERN_LEGEND: { Icon: LucideIcon; label: string; description: string }[] = [
  { Icon: Eye,           label: "Mind reading",    description: "Assuming what others think" },
  { Icon: AlertTriangle, label: "Catastrophizing", description: "Jumping to worst-case"      },
  { Icon: Frown,         label: "Self-criticism",  description: "Harsh self-judgment"        },
  { Icon: Telescope,     label: "Fortune telling", description: "Predicting a negative future"},
]

const EMOTION_LEGEND: { label: string; color: string }[] = [
  { label: "Anxiety / Fear", color: "oklch(0.62 0.14 55)"  },
  { label: "Sadness",        color: "oklch(0.50 0.12 225)" },
  { label: "Anger",          color: "oklch(0.56 0.16 22)"  },
  { label: "Guilt / Shame",  color: "oklch(0.50 0.13 300)" },
  { label: "Other",          color: "oklch(0.50 0.1 150)"  },
]

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"]
const DOW_FULL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]

function fmtMonthYear(year: number, month: number) {
  return `${MONTH_NAMES[month]} ${year}`
}
function fmtDateLong(dateKey: string) {
  // dateKey = "YYYY-MM-DD"
  const [y, m, d] = dateKey.split("-").map(Number)
  const dow = new Date(y, m - 1, d).getDay()
  return `${DOW_FULL[dow]}, ${MONTH_NAMES[m - 1]} ${d}`
}
function fmtTime(isoString: string) {
  const d = new Date(isoString)
  const h = d.getHours()
  const min = String(d.getMinutes()).padStart(2, "0")
  const ampm = h >= 12 ? "PM" : "AM"
  return `${h % 12 || 12}:${min} ${ampm}`
}

// ── Component ─────────────────────────────────────────────────────────────────
export function PractitionerCalendar({ thoughts }: Props) {
  const today = new Date()
  const [viewYear, setViewYear]         = useState(today.getFullYear())
  const [viewMonth, setViewMonth]       = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const thoughtsByDate = useMemo(() => {
    const map: Record<string, CalendarThought[]> = {}
    for (const t of thoughts) {
      const d   = new Date(t.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      if (!map[key]) map[key] = []
      map[key].push(t)
    }
    return map
  }, [thoughts])

  const firstDow    = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11) }
    else setViewMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0) }
    else setViewMonth((m) => m + 1)
  }

  const isFuture =
    viewYear > today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth >= today.getMonth())

  const monthLabel = fmtMonthYear(viewYear, viewMonth)

  const selectedThoughts = selectedDate ? (thoughtsByDate[selectedDate] ?? []) : []

  return (
    <div className="space-y-6">

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >←</button>
        <span className="text-sm font-medium text-foreground">{monthLabel}</span>
        <button
          onClick={nextMonth}
          disabled={isFuture}
          className="rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
        >→</button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 text-center">
        {DOW_LABELS.map((d) => (
          <div key={d} className="py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/40">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />

          const dateKey     = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          const dayThoughts = thoughtsByDate[dateKey] ?? []
          const hasThoughts = dayThoughts.length > 0
          const isSelected  = selectedDate === dateKey
          const isToday     = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day

          const topPattern = dominant(dayThoughts.map((t) => t.pattern))
          const topEmotion = dominant(dayThoughts.map((t) => t.emotion))
          const Icon       = getPatternIcon(topPattern)
          const color      = getEmotionColor(topEmotion)

          return (
            <button
              key={dateKey}
              onClick={() => setSelectedDate(isSelected ? null : dateKey)}
              className="flex flex-col items-center gap-1.5 rounded-xl py-2.5 transition-all"
              style={{
                background: isSelected
                  ? `${color}18`
                  : hasThoughts
                  ? "oklch(0.995 0.004 88 / 0.9)"
                  : "transparent",
                border: isSelected
                  ? `1.5px solid ${color}55`
                  : isToday
                  ? "1px solid oklch(0.82 0.02 88)"
                  : "1px solid transparent",
              }}
            >
              <span
                className="text-xs leading-none"
                style={{
                  fontWeight: isToday ? 600 : 400,
                  color: hasThoughts ? "oklch(0.22 0.018 248)" : "oklch(0.72 0.015 88)",
                }}
              >
                {day}
              </span>

              {hasThoughts ? (
                <>
                  <Icon
                    size={12}
                    strokeWidth={2}
                    style={{
                      color,
                      transition: "transform 0.15s",
                      transform: isSelected ? "scale(1.2)" : "scale(1)",
                    }}
                  />
                  <span
                    className="w-full truncate text-center leading-none"
                    style={{ fontSize: 8, color, letterSpacing: "0.01em" }}
                  >
                    {cap(topEmotion ?? "")}
                  </span>
                </>
              ) : (
                <span className="h-3 w-3" />
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="grid gap-4 rounded-2xl border border-border/50 bg-background/60 px-4 py-4 sm:grid-cols-2">
        <div>
          <p className="mb-2.5 text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground/50">
            Icon shape — thought pattern
          </p>
          <div className="space-y-2.5">
            {PATTERN_LEGEND.map(({ Icon, label, description }) => (
              <div key={label} className="flex items-start gap-2">
                <Icon size={13} strokeWidth={1.8} className="mt-px shrink-0 text-muted-foreground/55" />
                <div className="min-w-0">
                  <span className="text-[11px] font-medium text-foreground">{label}</span>
                  <span className="ml-1.5 text-[10px] text-muted-foreground/50">{description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2.5 text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground/50">
            Icon color — emotion
          </p>
          <div className="space-y-2.5">
            {EMOTION_LEGEND.map(({ label, color }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                <span className="text-[11px] text-foreground/80">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Drill-down panel */}
      {selectedDate && (
        <div
          className="rounded-[20px] border border-border/70 px-5 py-5 space-y-3"
          style={{ background: "oklch(0.993 0.005 88 / 0.96)" }}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground/70">
              {fmtDateLong(selectedDate)}
            </p>
            <span className="text-xs text-muted-foreground">
              {selectedThoughts.length} reflection{selectedThoughts.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="space-y-4">
            {selectedThoughts.map((t) => {
              const text    = (t.automaticThought ?? t.thought).trim()
              const time    = fmtTime(t.createdAt)
              const PatIcon = getPatternIcon(t.pattern)
              const color   = getEmotionColor(t.emotion)
              const isFullEvent = !!(t.situation || t.story || t.balancedThought)

              return (
                <div key={t.id} className="rounded-2xl border border-border/60 bg-background px-4 py-4 space-y-3">

                  {/* Tags + time */}
                  <div className="flex flex-wrap items-center gap-2">
                    {t.pattern && (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
                        style={{ background: `${color}15`, color, border: `1px solid ${color}35` }}
                      >
                        <PatIcon size={10} strokeWidth={2.2} className="shrink-0" />
                        {formatPattern(t.pattern)}
                      </span>
                    )}
                    {t.emotion && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
                        {cap(t.emotion)}
                      </span>
                    )}
                    <span className="ml-auto text-[10px] text-muted-foreground/50">{time}</span>
                  </div>

                  {/* Thought — always shown as prominent quote, matching "You wrote" in the tool */}
                  <p className="text-sm leading-[1.7] text-foreground italic">
                    &ldquo;{text}&rdquo;
                  </p>

                  {/* Full breakdown rows — only when extended fields are present */}
                  {isFullEvent && (
                    <div className="space-y-2.5 pt-1 border-t border-border/40">
                      {t.situation && (
                        <ReflectionRow label="What happened" value={t.situation} />
                      )}
                      {t.story && (
                        <ReflectionRow label="Where your mind went next" value={t.story} />
                      )}
                      {t.patternExplanation && (
                        <ReflectionRow label="The thinking trap" value={t.patternExplanation} accent={color} />
                      )}
                      {t.reflectionQuestion && (
                        <p className="text-xs leading-relaxed italic" style={{ color: "oklch(0.48 0.025 248)" }}>
                          {t.reflectionQuestion}
                        </p>
                      )}
                      {t.balancedThought?.trim() && (
                        <ReflectionRow label="What's more true" value={t.balancedThought.trim()} highlight />
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}

// ── ReflectionRow — used inside the full drill-down ───────────────────────────
function ReflectionRow({
  label,
  value,
  highlight,
  italic,
  accent,
}: {
  label: string
  value: string
  highlight?: boolean
  italic?: boolean
  accent?: string
}) {
  return (
    <div className="flex gap-3">
      <span
        className="w-[120px] shrink-0 text-[10px] font-medium uppercase tracking-[0.12em] pt-0.5"
        style={{ color: accent ?? "oklch(0.62 0.015 248)" }}
      >
        {label}
      </span>
      <span
        className={[
          "flex-1 text-xs leading-relaxed",
          highlight ? "font-medium text-foreground" : "text-foreground/70",
          italic ? "italic" : "",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  )
}
