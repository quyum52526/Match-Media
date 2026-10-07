/**
 * Canonical site constants + locale-aware URL helpers shared by metadata,
 * JSON-LD, the sitemap and robots. Mirrors i18n/routing.ts: bn is the default
 * locale and unprefixed; en lives under /en (localePrefix: "as-needed").
 */

/** Public origin, no trailing slash. NEXT_PUBLIC_APP_URL overrides per deploy. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "https://www.matchmediabd.xyz"
).replace(/\/+$/, "");
export const SITE_NAME = "Match Media";

/** Official brand social profiles — single source for the footer and Organization.sameAs. */
export const SOCIAL_LINKS = {
  facebook: "https://www.facebook.com/bdmatchmedia",
  instagram: "https://www.instagram.com/matc_hmedia/",
  youtube: "https://www.youtube.com/@matchmediabd",
} as const;
/** Brand fallback share image (1200x630, ~120KB — light enough for WhatsApp/FB previews). */
export const DEFAULT_OG_IMAGE = "/images/og-default.jpg";
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

export const SEO_LOCALES = ["bn", "en"] as const;
export type SeoLocale = (typeof SEO_LOCALES)[number];

/** hreflang code per locale (Bangla is region-tagged for Bangladesh). */
export const HREFLANG: Record<SeoLocale, string> = { bn: "bn-BD", en: "en" };
/** Open Graph locale per locale. */
export const OG_LOCALE: Record<SeoLocale, string> = {
  bn: "bn_BD",
  en: "en_US",
};

export function toSeoLocale(locale: string): SeoLocale {
  return locale === "en" ? "en" : "bn";
}

/**
 * Normalizes an app path to "/a/b" form: one leading slash, repeated slashes
 * collapsed, no trailing slash. The root ("", "/", "//") becomes "".
 */
function cleanPath(path: string): string {
  return `/${path}`.replace(/\/{2,}/g, "/").replace(/\/+$/, "");
}

/**
 * Absolute URL for an unlocalized path (assets, already-localized paths).
 * getAbsoluteUrl("/") → "https://…xyz"; getAbsoluteUrl("blog//x/") → "https://…xyz/blog/x".
 */
export function getAbsoluteUrl(path: string = ""): string {
  return `${SITE_URL}${cleanPath(path)}`;
}

/** Locale-prefixed path: ("en", "/about") → "/en/about"; ("bn", "/about") → "/about"; ("bn", "/") → "/". */
export function localePath(locale: SeoLocale, path: string = ""): string {
  const clean = cleanPath(path);
  if (locale === "bn") return clean || "/";
  return `/en${clean}`;
}

/**
 * Absolute localized URL. bn (default) is unprefixed, en is under /en.
 * Roots: bn → "https://…xyz", en → "https://…xyz/en".
 */
export function getLocalizedUrl(locale: string, path: string = ""): string {
  return getAbsoluteUrl(localePath(toSeoLocale(locale), path));
}

/** Absolute-URL Open Graph image descriptor for the brand fallback image. */
export function defaultOgImage(alt: string) {
  return {
    url: getAbsoluteUrl(DEFAULT_OG_IMAGE),
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    type: "image/jpeg",
    alt,
  };
}

/**
 * hreflang map for a path that exists in every locale. x-default points at
 * the Bangla URL (the default locale).
 */
export function hreflangAlternates(path: string): Record<string, string> {
  return hreflangFromUrls({
    bn: getLocalizedUrl("bn", path),
    en: getLocalizedUrl("en", path),
  });
}

/** hreflang map from per-locale absolute URLs (for content whose slug differs per locale). */
export function hreflangFromUrls(
  urls: Partial<Record<SeoLocale, string>>,
): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of SEO_LOCALES) {
    const url = urls[locale];
    if (url) languages[HREFLANG[locale]] = url;
  }
  const fallback = urls.bn ?? urls.en;
  if (fallback) languages["x-default"] = fallback;
  return languages;
}
