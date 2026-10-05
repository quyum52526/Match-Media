import type { MetadataRoute } from "next";
import {
  BLOG_LOCALES,
  blogPath,
  getAllPosts,
  type BlogLocale,
  type BlogPost,
} from "@/lib/blog";

const siteUrl = "https://www.matchmediabd.xyz";

function absoluteBlogUrl(locale: BlogLocale, slug?: string): string {
  return new URL(blogPath(locale, slug), siteUrl).toString();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const postsByLocale = new Map<BlogLocale, BlogPost[]>();
  await Promise.all(
    BLOG_LOCALES.map(async (locale) => {
      postsByLocale.set(locale, await getAllPosts(locale));
    }),
  );

  const blogIndexes: MetadataRoute.Sitemap = [
    {
      url: absoluteBlogUrl("bn"),
      alternates: {
        languages: {
          "bn-BD": absoluteBlogUrl("bn"),
          en: absoluteBlogUrl("en"),
        },
      },
    },
    {
      url: absoluteBlogUrl("en"),
      alternates: {
        languages: {
          "bn-BD": absoluteBlogUrl("bn"),
          en: absoluteBlogUrl("en"),
        },
      },
    },
  ];

  const entries: MetadataRoute.Sitemap = [];
  for (const locale of BLOG_LOCALES) {
    for (const post of postsByLocale.get(locale) ?? []) {
      const translations = BLOG_LOCALES.map((language) => {
        const translated = (postsByLocale.get(language) ?? []).find(
          (candidate) => candidate.translationKey === post.translationKey,
        );
        return translated
          ? [
              language === "bn" ? "bn-BD" : "en",
              absoluteBlogUrl(language, translated.slug),
            ]
          : null;
      }).filter((entry): entry is [string, string] => entry !== null);

      entries.push({
        url: absoluteBlogUrl(locale, post.slug),
        lastModified: new Date(`${post.date}T00:00:00.000Z`),
        alternates: { languages: Object.fromEntries(translations) },
      });
    }
  }

  return [...blogIndexes, ...entries];
}
