import { getTranslations } from "next-intl/server";

/**
 * Homepage footer — Charcoal surface with Ivory/light text to ground the bottom
 * of the page. Brand + tagline, standard links (Contact / Privacy / Terms), and
 * the honest legal disclaimer (exact Bengali per the blueprint, English
 * translation in the `en` locale). Server component.
 *
 * NOTE: the link hrefs are placeholders ("#") until the real Contact / Privacy /
 * Terms pages exist — wire them up when those routes are built.
 */
export async function HomeFooter() {
  const t = await getTranslations("Footer");
  const year = new Date().getFullYear();

  const links = [
    { label: t("contact"), href: "#" },
    { label: t("privacy"), href: "#" },
    { label: t("terms"), href: "#" },
  ];

  return (
    <footer className="bg-secondary text-canvas antialiased">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <span className="font-display text-lg font-medium tracking-tight">
              MatchMedia
            </span>
            <p className="mt-2 text-sm font-normal leading-relaxed text-canvas/60">
              {t("tagline")}
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Footer">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-sm font-normal text-canvas/70 transition-colors duration-150 ease-in-out hover:text-canvas"
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Legal */}
        <div className="mt-8 border-t border-canvas/10 pt-6">
          <p className="max-w-3xl text-xs font-normal leading-relaxed text-canvas/50">
            {t("disclaimer")}
          </p>
          <p className="mt-3 font-body text-xs text-canvas/40">
            {t("rights", { year: String(year) })}
          </p>
        </div>
      </div>
    </footer>
  );
}
