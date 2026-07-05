import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProfileDetail } from "@/components/profile/ProfileDetail";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { LockIcon, StarIcon } from "@/components/ui/icons";
import { getProfileForViewer, getProfileViewAccess } from "@/lib/data/profiles";
import { getPhotoRequestQuota } from "@/lib/data/billing";
import { requireViewerId } from "@/lib/session";

export const metadata = {
  title: "Profile · MatchMedia",
};

// DB-backed, viewer-scoped — render per request (never prerendered at build).
export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const viewerId = await requireViewerId(`/${locale}/login`);

  // Free-tier daily view cap — check BEFORE getProfileForViewer logs the view.
  const access = await getProfileViewAccess(viewerId, id);
  if (!access.allowed) {
    const t = await getTranslations("Pro.viewLimit");
    const proHref = locale === "en" ? "/en/pro" : "/pro";
    return (
      <Container className="flex flex-col items-center py-16 text-center">
        <div className="mx-auto flex w-full max-w-lg flex-col items-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
          <LockIcon width={26} height={26} />
        </span>
        <h1 className="text-2xl font-bold text-ink">{t("title")}</h1>
        <p className="mt-2 text-sm text-ink/70">
          {t("body", { limit: String(access.limit) })}
        </p>
        <Link href={proHref} className="mt-6">
          <Button variant="gold">
            <StarIcon width={16} height={16} />
            {t("cta")}
          </Button>
        </Link>
        </div>
      </Container>
    );
  }

  const [profile, quota] = await Promise.all([
    getProfileForViewer(id, viewerId),
    getPhotoRequestQuota(viewerId),
  ]);
  if (!profile) notFound();

  return <ProfileDetail data={profile} quota={quota} />;
}
