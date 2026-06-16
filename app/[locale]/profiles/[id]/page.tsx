import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ProfileDetail } from "@/components/profile/ProfileDetail";
import { getProfileForViewer } from "@/lib/data/profiles";
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

  const profile = await getProfileForViewer(id, viewerId);
  if (!profile) notFound();

  return <ProfileDetail data={profile} />;
}
