/**
 * Small count pill for pending-work indicators (admin tab nav, admin dropdown,
 * mobile admin section).
 *
 * Solid garnet rather than a tinted background: the theme's colour tokens are
 * bare `var()` hex values with no `<alpha-value>`, so a `/10`-style opacity
 * utility renders transparent and the badge would vanish.
 *
 * The visible number is capped so one large backlog cannot stretch a nav row,
 * while the real figure stays in the accessible label.
 */
export function CountBadge({
  count,
  label,
  max = 99,
}: {
  count: number;
  /** What the count is for — read out as "<label>: N pending". */
  label: string;
  max?: number;
}) {
  return (
    <span
      className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white"
      aria-label={`${label}: ${count} pending`}
    >
      {count > max ? `${max}+` : count}
    </span>
  );
}
