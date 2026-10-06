import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { Link } from "@/i18n/navigation";
import { BLOG_LOCALES, getAllPosts, type BlogLocale } from "@/lib/blog";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { toSeoLocale } from "@/lib/seo/site";
import { JsonLd } from "@/components/seo/JsonLd";

export async function generateStaticParams() {
  return BLOG_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isBengali = locale === "bn";
  return buildPageMetadata({
    locale,
    path: "/blog",
    title: isBengali ? "ব্লগ | Match Media" : "Blog | Match Media",
    description: isBengali
      ? "Match Media-র পরামর্শ, নিরাপদ matchmaking এবং গোপনীয়তা নিয়ে লেখা।"
      : "Articles from Match Media about thoughtful matchmaking, safety, and privacy.",
  });
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Blog");
  const posts = await getAllPosts(locale as BlogLocale);
  const isBengali = locale === "bn";

  return (
    <Container className="py-10">
      <header>
        <h1
          className={`font-display text-2xl font-semibold text-ink ${
            isBengali ? "font-bengali" : ""
          }`}
        >
          {t("title")}
        </h1>
        <p
          className={`mt-3 text-sm leading-relaxed text-ink/70 ${
            isBengali ? "font-bengali" : ""
          }`}
        >
          {t("intro")}
        </p>
      </header>

      {posts.length ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="overflow-hidden rounded-card border border-hairline bg-surface shadow-card transition-shadow hover:shadow-md"
            >
              <Link href={`/blog/${post.slug}`} className="group block">
                <div className="relative aspect-[1200/630] bg-canvas">
                  <Image
                    src={post.coverImage}
                    alt={post.coverAlt || post.title}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                  />
                </div>
                <div className={`p-5 ${isBengali ? "font-bengali" : ""}`}>
                  <p className="text-xs text-muted">
                    <time dateTime={post.date}>{post.date}</time>
                    <span aria-hidden="true"> · </span>
                    {post.author}
                    <span aria-hidden="true"> · </span>
                    {post.readingTime.label}
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-ink group-hover:text-primary">
                    {post.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink/70">
                    {post.description}
                  </p>
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
                </div>
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <p
          className={`mt-8 rounded-card border border-hairline bg-surface p-6 text-sm text-ink/70 ${
            isBengali ? "font-bengali" : ""
          }`}
        >
          {t("empty")}
        </p>
      )}
      <JsonLd
        data={breadcrumbSchema(toSeoLocale(locale), [
          { name: t("title"), path: "/blog" },
        ])}
      />
    </Container>
  );
}
