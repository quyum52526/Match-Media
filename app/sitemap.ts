import type { MetadataRoute } from "next";
import {
  BLOG_LOCALES,
  blogPath,
  getAllPosts,
  type BlogLocale,
  type BlogPost,
} from "@/lib/blog";

const siteUrl = "https://www.matchmediabd.xyz";

// Public marketing routes, listed once per locale in the sitemap.
const staticRoutes = ["/", "/about", "/contact", "/pricing"];

function absoluteBlogUrl(locale: BlogLocale, slug?: string): string {
  return new URL(blogPath(locale, slug), siteUrl).toString();
}

// bn is the default locale and has no prefix; en lives under /en.
function absoluteLocaleUrl(locale: BlogLocale, path: string): string {
  const localized = locale === "bn" ? path : path === "/" ? "/en" : `/en${path}`;
  return new URL(localized, siteUrl).toString();
}

/** hreflang map; x-default points at the Bangla (default locale) URL. */
function languageAlternates(urls: Partial<Record<BlogLocale, string>>) {
  const languages: Record<string, string> = {};
  if (urls.bn) languages["bn-BD"] = urls.bn;
  if (urls.en) languages.en = urls.en;
  if (urls.bn) languages["x-default"] = urls.bn;
  return { languages };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const postsByLocale = new Map<BlogLocale, BlogPost[]>();
  await Promise.all(
    BLOG_LOCALES.map(async (locale) => {
      postsByLocale.set(locale, await getAllPosts(locale));
    }),
  );

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.flatMap((path) => {
    const urls = {
      bn: absoluteLocaleUrl("bn", path),
      en: absoluteLocaleUrl("en", path),
    };
    return BLOG_LOCALES.map((locale) => ({
      url: urls[locale],
      alternates: languageAlternates(urls),
    }));
  });

  const blogIndexUrls = { bn: absoluteBlogUrl("bn"), en: absoluteBlogUrl("en") };
  const blogIndexes: MetadataRoute.Sitemap = BLOG_LOCALES.map((locale) => ({
    url: blogIndexUrls[locale],
    alternates: languageAlternates(blogIndexUrls),
  }));

  const entries: MetadataRoute.Sitemap = [];
  for (const locale of BLOG_LOCALES) {
    for (const post of postsByLocale.get(locale) ?? []) {
      const urls: Partial<Record<BlogLocale, string>> = {};
      for (const language of BLOG_LOCALES) {
        const translated = (postsByLocale.get(language) ?? []).find(
          (candidate) => candidate.translationKey === post.translationKey,
        );
        if (translated) urls[language] = absoluteBlogUrl(language, translated.slug);
      }

      entries.push({
        url: absoluteBlogUrl(locale, post.slug),
        lastModified: new Date(`${post.date}T00:00:00.000Z`),
        alternates: languageAlternates(urls),
      });
    }
  }

  return [...staticEntries, ...blogIndexes, ...entries];
}
