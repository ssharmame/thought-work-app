/**
 * BrandLogo — the ThoughtLens wordmark used in every navbar.
 *
 * Props:
 *   size        "sm" | "md" (default "md")
 *               sm  → monogram h-7 w-7, text ~1.05rem — tight app navbars
 *               md  → monogram h-8 w-8 sm:h-9 sm:w-9, text 1.18rem — landing + wider navbars
 *   showTagline  show the "Between-session clarity" line (landing page only)
 */
export function BrandLogo({
  size = "md",
  showTagline = false,
}: {
  size?: "sm" | "md";
  showTagline?: boolean;
}) {
  const monogram =
    size === "sm"
      ? "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/70 font-display text-[0.65rem] font-medium text-foreground"
      : "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/75 font-display text-xs font-medium text-foreground sm:h-9 sm:w-9 sm:text-[0.72rem]";

  const wordmark =
    size === "sm"
      ? "font-display text-[1.05rem] font-medium tracking-[-0.012em] text-foreground"
      : "font-display text-[1.15rem] font-medium tracking-[-0.015em] text-foreground sm:text-[1.28rem]";

  return (
    <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
      {/* TL monogram — sage-green gradient circle */}
      <span
        className={monogram}
        style={{
          background:
            "linear-gradient(145deg, oklch(0.988 0.01 88) 0%, oklch(0.945 0.026 150 / 0.85) 100%)",
        }}
      >
        TL
      </span>

      <div className="min-w-0">
        <p className={`truncate ${wordmark}`}>ThoughtLens</p>
        {showTagline && (
          <p className="hidden text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground/70 sm:block">
            Between-session clarity
          </p>
        )}
      </div>
    </div>
  );
}
