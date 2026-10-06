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

const siteUrl = "https://www.matchmediabd.xyz";

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
      return translated ? [language, translated] as const : null;
    }),
  );
  const languages = Object.fromEntries(
    translations
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .map(([language, translated]) => [
        language === "bn" ? "bn-BD" : "en",
        new URL(blogPath(language, translated.slug), siteUrl).toString(),
      ]),
  );
  const url = new URL(blogPath(locale as BlogLocale, post.slug), siteUrl).toString();
  const headTitle = post.metaTitle ?? post.title;

  return {
    title: headTitle,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: url, languages },
    openGraph: {
      title: headTitle,
      description: post.description,
      url,
      type: "article",
      publishedTime: new Date(`${post.date}T00:00:00.000Z`).toISOString(),
      authors: [post.author],
      images: [{ url: post.coverImage, alt: post.coverAlt || post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: headTitle,
      description: post.description,
      images: [post.coverImage],
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
  const articleUrl = new URL(blogPath(locale as BlogLocale, post.slug), siteUrl).toString();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    image: [new URL(post.coverImage, siteUrl).toString()],
    datePublished: new Date(`${post.date}T00:00:00.000Z`).toISOString(),
    author: { "@type": "Person", name: post.author },
    mainEntityOfPage: articleUrl,
    inLanguage: isBengali ? "bn-BD" : "en",
    publisher: { "@type": "Organization", name: "MatchMedia" },
  };

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </Container>
  );
}
