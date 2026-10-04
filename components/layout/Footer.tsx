import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  ShieldCheckIcon,
  LockIcon,
  UsersIcon,
} from "@/components/ui/icons";

/**
 * App-wide footer — solid Midnight Ink surface with a faint brand watermark,
 * mounted once in the locale layout so every page gets it. Brand + tagline +
 * three link columns, a trust-signal strip, then copyright + the
 * honest legal disclaimer. Server component.
 */
export async function Footer() {
  const t = await getTranslations("Footer");
  const year = new Date().getFullYear();

  const columns = [
    {
      heading: t("colDiscover"),
      links: [
        { label: t("discoverBrowse"), href: "/browse" },
        { label: t("discoverHow"), href: "/#how-it-works" },
        { label: t("discoverPricing"), href: "/pricing" },
      ],
    },
    {
      heading: t("colCompany"),
      links: [
        { label: t("companyAbout"), href: "/about" },
        { label: t("companyBlog"), href: "/blog" },
        { label: t("contact"), href: "/contact" },
      ],
    },
    {
      heading: t("colTrust"),
      links: [
        { label: t("trustSafety"), href: "/safety" },
        { label: t("privacy"), href: "/privacy" },
        { label: t("terms"), href: "/terms" },
      ],
    },
  ];

  const signals = [
    { Icon: ShieldCheckIcon, label: t("signalBlurred") },
    { Icon: LockIcon, label: t("signalContact") },
    { Icon: UsersIcon, label: t("signalGuardian") },
  ];

  return (
    <footer className="relative overflow-hidden bg-secondary antialiased">
      {/* Faint brand watermark. Opacity uses the `opacity` utility (not a
          color-channel /modifier), so it isn't subject to the theme tokens'
          missing <alpha-value> slot. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[url('/match-media-bg-02.svg')] bg-cover bg-center opacity-[0.06]"
      />

      <div className="relative mx-auto max-w-6xl px-4 py-16">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          {/* Brand + socials */}
          <div className="flex max-w-sm flex-col items-start gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/match-media-footer-logo-onink.svg"
              alt="Match Media"
              className="h-11 w-auto"
            />
            <p className="text-[15px] font-normal leading-relaxed text-[rgba(251,247,242,0.7)]">
              {t("tagline")}
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.heading} className="flex flex-col gap-3">
              <p className="m-0 text-xs font-medium uppercase tracking-[0.14em] text-accent">
                {col.heading}
              </p>
              {col.links.map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  className="text-sm font-normal leading-[1.9] text-[rgba(251,247,242,0.7)] transition-colors duration-150 ease-out hover:text-canvas"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        {/* Trust signal strip */}
        <div className="mt-12 flex flex-wrap gap-7 border-t border-b border-t-[rgba(200,162,75,0.28)] border-b-white/[0.08] py-5">
          {signals.map(({ Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 text-[13px] font-normal leading-tight text-[rgba(251,247,242,0.6)]"
            >
              <Icon width={16} height={16} className="text-success" />
              {label}
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-wrap items-center justify-between gap-6 py-6">
          <p className="m-0 text-[13px] font-normal leading-relaxed text-[rgba(251,247,242,0.5)]">
            {t("rights", { year: String(year) })}
          </p>
          <p className="m-0 max-w-[62ch] text-[13px] font-normal leading-relaxed text-[rgba(251,247,242,0.5)] sm:text-right">
            {t("disclaimer")}
          </p>
        </div>
      </div>
    </footer>
  );
}
