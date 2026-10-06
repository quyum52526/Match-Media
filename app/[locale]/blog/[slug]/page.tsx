import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { Link } from "@/i18n/navigation";
import {
  BLOG_LOCALES,
  blogPath,
  getAllPosts,
  getPost,
  getTranslation,
  type BlogLocale,
} from "@/lib/blog";
import { articleSchema, breadcrumbSchema } from "@/lib/seo/schema";
import {
  OG_LOCALE,
  SITE_NAME,
  getAbsoluteUrl,
  hreflangFromUrls,
  toSeoLocale,
  type SeoLocale,
} from "@/lib/seo/site";
import { JsonLd } from "@/components/seo/JsonLd";

export async function generateStaticParams() {
  const localizedPosts = await Promise.all(
    BLOG_LOCALES.map(async (locale) =>
      (await getAllPosts(locale)).map((post) => ({
        locale,
        slug: post.slug,
      })),
    ),
  );
  return localizedPosts.flat();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getPost(locale as BlogLocale, slug);
  if (!post) notFound();

  const translations = await Promise.all(
    BLOG_LOCALES.map(async (language) => {
      const translated =
        language === locale
          ? post
          : await getTranslation(post.translationKey, language);
      return translated ? ([language, translated] as const) : null;
    }),
  );
  const urls: Partial<Record<SeoLocale, string>> = {};
  for (const entry of translations) {
    if (entry)
      urls[entry[0]] = getAbsoluteUrl(blogPath(entry[0], entry[1].slug));
  }
  const languages = hreflangFromUrls(urls);
  const url = getAbsoluteUrl(blogPath(locale as BlogLocale, post.slug));
  const headTitle = post.metaTitle ?? post.title;
  const publishedTime = new Date(`${post.date}T00:00:00.000Z`).toISOString();
  const modifiedTime = new Date(
    `${post.updated ?? post.date}T00:00:00.000Z`,
  ).toISOString();
  const coverUrl = getAbsoluteUrl(post.coverImage);

  return {
    title: headTitle,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: url, languages },
    openGraph: {
      siteName: SITE_NAME,
      locale: OG_LOCALE[toSeoLocale(locale)],
      title: headTitle,
      description: post.description,
      url,
      type: "article",
      publishedTime,
      modifiedTime,
      authors: [SITE_NAME],
      tags: post.tags,
      images: [{ url: coverUrl, alt: post.coverAlt || post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: headTitle,
      description: post.description,
      images: [{ url: coverUrl, alt: post.coverAlt || post.title }],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const post = await getPost(locale as BlogLocale, slug);
  if (!post) notFound();

  const isBengali = locale === "bn";
  const otherLocale: BlogLocale = isBengali ? "en" : "bn";
  const translated = await getTranslation(post.translationKey, otherLocale);
  const t = await getTranslations("Blog");
  const seoLocale = toSeoLocale(locale);
  const articleUrl = getAbsoluteUrl(blogPath(locale as BlogLocale, post.slug));
  const jsonLd = [
    articleSchema({
      locale: seoLocale,
      url: articleUrl,
      headline: post.title,
      description: post.description,
      image: post.coverImage,
      datePublished: post.date,
      dateModified: post.updated,
      author: post.author,
      keywords: post.keywords,
    }),
    breadcrumbSchema(seoLocale, [
      { name: t("title"), path: "/blog" },
      { name: post.title, path: `/blog/${post.slug}` },
    ]),
  ];

  return (
    <Container className="py-10">
      <article className={isBengali ? "font-bengali" : "font-body"}>
        <header className="mx-auto max-w-3xl">
          <Link
            href="/blog"
            className="text-sm font-medium text-primary hover:underline"
          >
            {t("backToBlog")}
          </Link>
          <h1 className="mt-5 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            {post.title}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-ink/70">
            {post.description}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
            <span>{post.author}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={post.date}>{post.date}</time>
            {translated && (
              <>
                <span aria-hidden="true">·</span>
                <Link
                  href={`/blog/${translated.slug}`}
                  locale={otherLocale}
                  className="font-medium text-primary hover:underline"
                >
                  {isBengali ? t("readInEnglish") : t("readInBengali")}
                </Link>
              </>
            )}
          </div>
          {post.tags.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-pill bg-primary/5 px-2.5 py-1 text-xs text-primary"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </header>

        <div className="relative mx-auto mt-8 aspect-[1200/630] max-w-5xl overflow-hidden rounded-card bg-canvas">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.coverImage}
            alt={post.coverAlt || post.title}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="mx-auto mt-10 max-w-3xl space-y-5 text-base leading-8 text-ink/80 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-accent [&_blockquote]:pl-4 [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-ink [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-ink [&_li]:ml-6 [&_li]:list-disc [&_ol_li]:list-decimal [&_ul]:space-y-2">
          <MDXRemote source={post.content} />
        </div>
      </article>
      <JsonLd data={jsonLd} />
    </Container>
  );
}
