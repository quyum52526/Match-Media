import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { BlogList } from "@/components/blog/BlogList";
import type { BlogPost } from "@/components/blog/BlogModal";

export const metadata = {
  title: "Blog · MatchMedia",
};

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Blog");
  const posts = t.raw("posts") as BlogPost[];

  return (
    <Container className="py-10">
      <h1 className="font-display text-2xl font-semibold text-ink">
        {t("title")}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink/70">
        {t("intro")}
      </p>

      {/* Cards open the full article in a modal — no page navigation. */}
      <div className="mt-8">
        <BlogList posts={posts} readMoreLabel={t("readMore")} />
      </div>
    </Container>
  );
}
