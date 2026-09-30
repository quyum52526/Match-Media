import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

/**
 * Pager for the browse grid.
 *
 * Plain <Link>s rather than a client component with router pushes: every control
 * is a real URL, so the page is shareable and bookmarkable, back/forward behave,
 * and it works before (or without) JS. The skeleton comes from the Suspense
 * boundary the links navigate into, not from local state.
 *
 * Filters are carried by rebuilding the CURRENT query string and overwriting
 * only `page` — a hand-written `?page=2` link would silently drop the viewer's
 * gender/religion/district filters.
 */
export async function BrowsePagination({
  page,
  pageCount,
  total,
  searchParams,
}: {
  page: number;
  pageCount: number;
  total: number;
  /** The page's raw searchParams, so every active filter survives the hop. */
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const t = await getTranslations("Browse.pagination");
  if (pageCount <= 1) return null;

  function hrefFor(target: number): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === "page" || value === undefined) continue;
      // A repeated param arrives as an array; keep every occurrence.
      for (const v of Array.isArray(value) ? value : [value]) {
        if (v) params.append(key, v);
      }
    }
    // Page 1 is the canonical bare URL — no ?page=1 clutter.
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `/browse?${qs}` : "/browse";
  }

  const pages = pageWindow(page, pageCount);
  const prevDisabled = page <= 1;
  const nextDisabled = page >= pageCount;

  return (
    <nav
      aria-label={t("label")}
      className="mt-8 flex flex-col items-center gap-3"
    >
      <div className="flex items-center gap-1.5">
        <Step
          href={hrefFor(page - 1)}
          disabled={prevDisabled}
          label={t("prev")}
        />

        {pages.map((p, i) =>
          p === null ? (
            <span
              key={`gap-${i}`}
              aria-hidden="true"
              className="px-1 text-sm text-ink/35"
            >
              …
            </span>
          ) : (
            <Link
              key={p}
              href={hrefFor(p)}
              aria-current={p === page ? "page" : undefined}
              aria-label={t("goToPage", { page: String(p) })}
              className={cn(
                "flex h-9 min-w-9 items-center justify-center rounded-xl border px-2.5 font-body text-sm transition-colors",
                p === page
                  ? "border-primary bg-primary/10 font-semibold text-primary"
                  : "border-hairline bg-white text-ink/70 hover:border-primary/40 hover:text-primary",
              )}
            >
              {p}
            </Link>
          ),
        )}

        <Step
          href={hrefFor(page + 1)}
          disabled={nextDisabled}
          label={t("next")}
        />
      </div>

      <p className="font-body text-xs text-ink/50">
        {t("summary", {
          page: String(page),
          pageCount: String(pageCount),
          total: String(total),
        })}
      </p>
    </nav>
  );
}

/**
 * Prev/Next. A disabled step renders as a <span>, not a dimmed link: an anchor
 * that looks inert but still navigates is worse than no control at all.
 */
function Step({
  href,
  disabled,
  label,
}: {
  href: string;
  disabled: boolean;
  label: string;
}) {
  const base =
    "flex h-9 items-center justify-center rounded-xl border px-3 text-sm transition-colors";
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={cn(base, "cursor-not-allowed border-hairline bg-ink/5 text-ink/30")}
      >
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className={cn(
        base,
        "border-hairline bg-white text-ink/70 hover:border-primary/40 hover:text-primary",
      )}
    >
      {label}
    </Link>
  );
}

/**
 * Page numbers to render: always first and last, the current page and its
 * neighbours, with `null` marking an elided run. Keeps the control a fixed width
 * whether there are 3 pages or 300.
 */
function pageWindow(page: number, pageCount: number): Array<number | null> {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const out: Array<number | null> = [1];
  const from = Math.max(2, page - 1);
  const to = Math.min(pageCount - 1, page + 1);
  if (from > 2) out.push(null);
  for (let p = from; p <= to; p++) out.push(p);
  if (to < pageCount - 1) out.push(null);
  out.push(pageCount);
  return out;
}
