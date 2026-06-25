import { getTranslations } from "next-intl/server";
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
 * NOTE: link/social hrefs are placeholders ("#") until the real Contact /
 * Privacy / Terms pages + social accounts are wired up.
 */
export async function HomeFooter() {
  const t = await getTranslations("Footer");
  const year = new Date().getFullYear();

  const links = [
    { label: t("contact"), href: "#" },
    { label: t("privacy"), href: "#" },
    { label: t("terms"), href: "#" },
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
            <span className="font-display text-lg font-medium tracking-tight">
              MatchMedia
            </span>
            <p className="mt-2 text-sm font-normal leading-relaxed text-canvas/60">
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
              {links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  className="text-sm font-normal text-canvas/70 transition-colors duration-150 ease-out hover:text-canvas"
                >
                  {l.label}
                </a>
              ))}
            </div>
          </nav>
        </div>

        {/* Legal */}
        <div className="mt-10 border-t border-white/10 pt-6">
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
