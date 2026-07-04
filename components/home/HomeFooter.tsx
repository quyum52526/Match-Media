import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  FacebookIcon,
  InstagramIcon,
  YoutubeIcon,
} from "@/components/ui/icons";

/**
 * Homepage footer — solid Midnight Ink surface with Ivory/light text to ground
 * the bottom of the page. Brand + tagline + socials on the left, a tidy link
 * column on the right, then the honest legal disclaimer (exact Bengali per the
 * blueprint, English translation in the `en` locale) + copyright. Server
 * component.
 *
 * NOTE: social hrefs are placeholders ("#") until real accounts are wired up.
 * Privacy Policy has no page yet, so it stays a placeholder too.
 */
export async function HomeFooter() {
  const t = await getTranslations("Footer");
  const year = new Date().getFullYear();

  const links = [
    { label: t("contact"), href: "/contact" },
    { label: t("privacy"), href: "#" },
    { label: t("terms"), href: "/terms" },
  ];

  const socials = [
    { label: "Facebook", href: "#", Icon: FacebookIcon },
    { label: "Instagram", href: "#", Icon: InstagramIcon },
    { label: "YouTube", href: "#", Icon: YoutubeIcon },
  ];

  return (
    <footer className="bg-secondary text-canvas antialiased">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          {/* Brand + socials */}
          <div className="max-w-sm">
            {/* Brand lockup on a clean white card — the logo's navy ink reads
                as near-invisible on the dark footer, so the light backing keeps
                it legible. Links home. */}
            <Link
              href="/"
              aria-label="MatchMedia"
              className="inline-block rounded-card bg-surface px-5 py-3 shadow-card"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/match-media-footer-logo.svg"
                alt="Match Media"
                className="h-10 w-auto sm:h-12"
              />
            </Link>
            <p className="mt-3 font-body text-xs text-canvas/40">
              {t("rights", { year: String(year) })}
            </p>
            <p className="mt-4 text-sm font-normal leading-relaxed text-canvas/60">
              {t("tagline")}
            </p>
            <div className="mt-5 flex items-center gap-2">
              {socials.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-canvas/70 transition-all duration-150 ease-out hover:border-white/20 hover:bg-white/5 hover:text-canvas"
                >
                  <Icon width={17} height={17} />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <nav
            className="flex flex-col gap-3 sm:flex-row sm:gap-x-10"
            aria-label="Footer"
          >
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-medium uppercase tracking-wide text-canvas/40">
                {t("colLegal")}
              </span>
              {links.map((l) =>
                l.href === "#" ? (
                  <a
                    key={l.label}
                    href={l.href}
                    className="text-sm font-normal text-canvas/70 transition-colors duration-150 ease-out hover:text-canvas"
                  >
                    {l.label}
                  </a>
                ) : (
                  <Link
                    key={l.label}
                    href={l.href}
                    className="text-sm font-normal text-canvas/70 transition-colors duration-150 ease-out hover:text-canvas"
                  >
                    {l.label}
                  </Link>
                ),
              )}
            </div>
          </nav>
        </div>

        {/* Legal — copyright now lives under the brand lockup above. */}
        <div className="mt-10 border-t border-white/10 pt-6">
          <p className="max-w-3xl text-xs font-normal leading-relaxed text-canvas/50">
            {t("disclaimer")}
          </p>
        </div>
      </div>
    </footer>
  );
}
