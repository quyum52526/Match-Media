import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card, CardBody } from "@/components/ui/Card";

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
  const posts = t.raw("posts") as {
    title: string;
    date: string;
    excerpt: string;
  }[];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-2xl font-semibold text-ink">
        {t("title")}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink/70">
        {t("intro")}
      </p>

      <div className="mt-8 space-y-4">
        {posts.map((post) => (
          <Card key={post.title}>
            <CardBody>
              <p className="text-xs font-medium uppercase tracking-wide text-ink/40">
                {post.date}
              </p>
              <h2 className="mt-1 text-base font-semibold text-ink">
                {post.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink/70">
                {post.excerpt}
              </p>
            </CardBody>
          </Card>
        ))}
      </div>
    </main>
  );
}
