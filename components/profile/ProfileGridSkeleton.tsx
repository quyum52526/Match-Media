/**
 * Placeholder grid shown while a page of browse results is being fetched.
 *
 * Mirrors ProfileGrid's column counts and ProfileCard's 4:5 image ratio and
 * footer height, so swapping in the real cards does not reflow the page — the
 * point of a skeleton is to hold the layout still, not merely to look busy.
 */
export function ProfileGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <article
          key={i}
          className="flex animate-pulse flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm"
        >
          {/* Matches ProfileCard's aspect-[4/5] media area. */}
          <div className="aspect-[4/5] w-full bg-ink/10" />
          <div className="space-y-2.5 p-4">
            <div className="h-4 w-2/3 rounded bg-ink/10" />
            <div className="h-3 w-1/2 rounded bg-ink/[0.07]" />
            <div className="h-2 w-full rounded-full bg-ink/[0.07]" />
            <div className="h-9 w-full rounded-xl bg-ink/[0.07]" />
          </div>
        </article>
      ))}
    </div>
  );
}
