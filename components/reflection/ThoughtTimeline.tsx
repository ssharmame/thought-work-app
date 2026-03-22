type Thought = {
  id: string
  thought: string
}

type Props = {
  situation?: string
  thoughts?: Thought[]
}

export default function ThoughtTimeline({ situation, thoughts = [] }: Props) {
  if (!situation) return null

  return (
    <div
      className="mb-8 rounded-2xl px-5 py-4 space-y-3"
      style={{
        background: "oklch(0.994 0.004 88)",
        border: "1px solid oklch(0.88 0.012 88 / 0.7)",
      }}
    >
      <div>
        <p
          className="text-xs font-semibold tracking-wide mb-1"
          style={{ color: "oklch(0.46 0.12 152)" }}
        >
          Situation we&apos;re exploring
        </p>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "oklch(0.28 0.018 248)" }}
        >
          {situation}
        </p>
      </div>

      {thoughts.length > 0 && (
        <div
          className="pt-3"
          style={{ borderTop: "1px solid oklch(0.88 0.012 88 / 0.7)" }}
        >
          <p
            className="text-xs font-semibold tracking-wide mb-2"
            style={{ color: "oklch(0.42 0.025 248)" }}
          >
            Previous thoughts in this reflection
          </p>
          <ul className="space-y-1">
            {thoughts.map((t, index) => (
              <li
                key={t.id}
                className="text-sm leading-relaxed"
                style={{ color: "oklch(0.38 0.018 248)" }}
              >
                {index + 1}. {t.thought}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
