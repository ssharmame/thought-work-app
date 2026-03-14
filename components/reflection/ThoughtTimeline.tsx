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
    <div className="mb-6 space-y-4">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="mb-2 text-sm font-semibold tracking-wide text-emerald-700">
          Situation we&apos;re exploring
        </p>
        <p className="text-base font-semibold leading-relaxed text-emerald-950">
          {situation}
        </p>
      </div>

      {thoughts.length > 0 && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-5">
          <p className="mb-2 text-sm font-semibold tracking-wide text-sky-700">
            Previous thoughts in this reflection
          </p>

          <ul className="space-y-2">
            {thoughts.map((t, index) => (
              <li key={t.id} className="text-base font-medium text-sky-950">
                {index + 1}. {t.thought}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
