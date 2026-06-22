import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { PhotoManager } from "@/components/profile/PhotoManager";
import { Card, CardBody } from "@/components/ui/Card";
import { getEditableProfile } from "@/lib/data/profiles";
import { getOwnPhotos } from "@/lib/data/photos";
import { MAX_PHOTOS } from "@/lib/storage/images";
import { requireViewerId } from "@/lib/session";

export const metadata = {
  title: "Edit Profile · MatchMedia",
};

export default async function ProfileEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { locale } = await params;
  const { welcome } = await searchParams;
  setRequestLocale(locale);
  const viewerId = await requireViewerId(`/${locale}/login`);
  const t = await getTranslations("ProfileEdit");

  const initial = await getEditableProfile(viewerId);
  // A Profile row requires gender (non-null), so an empty gender means the user
  // hasn't created one yet — photos hang off Profile, so defer the uploader.
  const hasProfile = initial.gender !== "";
  const photos = hasProfile ? await getOwnPhotos(viewerId) : [];
  const isWelcome = welcome === "1";

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-charcoal">
          {isWelcome ? t("welcome.title") : t("title")}
        </h1>
      </header>

      {isWelcome && (
        <Card className="mb-6 border-trustGreen/20 bg-trustGreen/[0.04]">
          <CardBody>
            <p className="text-sm text-charcoal/80">{t("welcome.body")}</p>
          </CardBody>
        </Card>
      )}

      {hasProfile ? (
        <div className="mb-6">
          <PhotoManager photos={photos} maxPhotos={MAX_PHOTOS} />
        </div>
      ) : (
        <Card className="mb-6 border-charcoal/10">
          <CardBody>
            <p className="text-sm text-charcoal/70">{t("photos.needProfile")}</p>
          </CardBody>
        </Card>
      )}

      <ProfileEditForm initial={initial} />
    </main>
  );
}
