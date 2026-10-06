import type { MetadataRoute } from "next";
import {
  BLOG_LOCALES,
  blogPath,
  getAllPosts,
  type BlogLocale,
  type BlogPost,
} from "@/lib/blog";
import {
  getAbsoluteUrl,
  getLocalizedUrl,
  hreflangAlternates,
  hreflangFromUrls,
} from "@/lib/seo/site";

// Public marketing routes, listed once per locale. Member-only routes
// (/browse, /profiles/*, dashboards…) are robots-disallowed and stay out.
const staticRoutes = [
  "/",
  "/about",
  "/contact",
  "/pricing",
  "/safety",
  "/terms",
  "/privacy",
  "/user-guide",
  "/events",
  "/blog",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const postsByLocale = new Map<BlogLocale, BlogPost[]>();
  await Promise.all(
    BLOG_LOCALES.map(async (locale) => {
      postsByLocale.set(locale, await getAllPosts(locale));
    }),
  );

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.flatMap((path) =>
    BLOG_LOCALES.map((locale) => ({
      url: getLocalizedUrl(locale, path),
      alternates: { languages: hreflangAlternates(path) },
    })),
  );

  const postEntries: MetadataRoute.Sitemap = [];
  for (const locale of BLOG_LOCALES) {
    for (const post of postsByLocale.get(locale) ?? []) {
      const urls: Partial<Record<BlogLocale, string>> = {};
      for (const language of BLOG_LOCALES) {
        const translated = (postsByLocale.get(language) ?? []).find(
          (candidate) => candidate.translationKey === post.translationKey,
        );
        if (translated)
          urls[language] = getAbsoluteUrl(blogPath(language, translated.slug));
      }

      postEntries.push({
        url: getAbsoluteUrl(blogPath(locale, post.slug)),
        lastModified: new Date(`${post.date}T00:00:00.000Z`),
        alternates: { languages: hreflangFromUrls(urls) },
      });
    }
  }

  return [...staticEntries, ...postEntries];
}
