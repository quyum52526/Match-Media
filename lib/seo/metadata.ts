import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  DEFAULT_OG_IMAGE,
  OG_LOCALE,
  SITE_NAME,
  SEO_LOCALES,
  getLocalizedUrl,
  hreflangAlternates,
  toSeoLocale,
} from "./site";

/** Pages whose SEO copy lives under `Seo.<key>` in messages/{bn,en}.json. */
export type SeoPageKey =
  | "home"
  | "about"
  | "contact"
  | "pricing"
  | "safety"
  | "terms"
  | "privacy"
  | "userGuide"
  | "events";

/**
 * Full metadata for a public page that exists at the same path in every
 * locale: absolute title, description, self-referencing canonical, hreflang
 * (bn-BD / en / x-default), and per-page Open Graph + Twitter tags.
 *
 * Open Graph/Twitter are set per page because Next merges metadata shallowly —
 * a child that omits `openGraph` would otherwise inherit the layout's object
 * (and its URL/title) verbatim.
 */
export function buildPageMetadata({
  locale,
  path,
  title,
  description,
}: {
  locale: string;
  path: string;
  title: string;
  description: string;
}): Metadata {
  const seoLocale = toSeoLocale(locale);
  const url = getLocalizedUrl(seoLocale, path);

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url, languages: hreflangAlternates(path) },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      url,
      title,
      description,
      locale: OG_LOCALE[seoLocale],
      alternateLocale: SEO_LOCALES.filter((l) => l !== seoLocale).map(
        (l) => OG_LOCALE[l],
      ),
      images: [
        { url: DEFAULT_OG_IMAGE, width: 2848, height: 1504, alt: title },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

/** `buildPageMetadata` with title/description read from `Seo.<key>` messages. */
export async function getPageMetadata(
  locale: string,
  key: SeoPageKey,
  path: string,
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: `Seo.${key}` });
  return buildPageMetadata({
    locale,
    path,
    title: t("title"),
    description: t("description"),
  });
}

/** Spread into a private page's metadata to keep it out of search indexes. */
export const NO_INDEX: Pick<Metadata, "robots"> = {
  robots: { index: false, follow: false },
};
