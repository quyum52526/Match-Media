import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { PhotoManager } from "@/components/profile/PhotoManager";
import { AgencyEditForm } from "@/components/profile/AgencyEditForm";
import { AgentStatusCard } from "@/components/profile/AgentStatusCard";
import { Card, CardBody } from "@/components/ui/Card";
import { getEditableProfile } from "@/lib/data/profiles";
import { getOwnPhotos } from "@/lib/data/photos";
import { MAX_PHOTOS } from "@/lib/storage/images";
import { requireViewerId } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Edit Profile · MatchMedia",
};

/**
 * Safely fetch the fields we need from User without crashing if the DB
 * hasn't been migrated yet (accountCategory / agency columns may be absent).
 * Falls back to null category + empty agency data on any DB error.
 */
async function getUserMeta(viewerId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: viewerId },
      select: {
        accountCategory: true,
        agencyName: true,
        contactPerson: true,
        agencyDistrict: true,
        email: true,
        mobile: true,
        role: true,
      } as never, // cast: new columns may not exist in the DB yet; Prisma will
                  // return undefined for them rather than throwing, after migrate
    });
    return {
      category: (user as { accountCategory?: string | null })?.accountCategory ?? null,
      agencyName: (user as { agencyName?: string | null })?.agencyName ?? "",
      contactPerson: (user as { contactPerson?: string | null })?.contactPerson ?? "",
      agencyDistrict: (user as { agencyDistrict?: string | null })?.agencyDistrict ?? "",
      // Agents are "verified" when an admin promotes their role (future feature).
      // For now we use role === "AGENT" + a manual flag tracked in profile.
      isVerified: false,
      email: (user as { email?: string })?.email ?? "",
      mobile: (user as { mobile?: string | null })?.mobile ?? null,
    };
  } catch {
    // DB hasn't been migrated yet — degrade gracefully to the standard form.
    return {
      category: null,
      agencyName: "",
      contactPerson: "",
      agencyDistrict: "",
      isVerified: false,
      email: "",
      mobile: null,
    };
  }
}

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
  const isWelcome = welcome === "1";

  const [userMeta, initial] = await Promise.all([
    getUserMeta(viewerId),
    getEditableProfile(viewerId),
  ]);

  const { category, agencyName, contactPerson, agencyDistrict, isVerified, email, mobile } =
    userMeta;

  // ── AGENT ─────────────────────────────────────────────────────────────────
  if (category === "AGENT") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Verification Agent
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink">My Account</h1>
        </header>
        <AgentStatusCard isVerified={isVerified} email={email} mobile={mobile} />
      </main>
    );
  }

  // ── MEDIA ──────────────────────────────────────────────────────────────────
  if (category === "MEDIA") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Media Agency
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink">Agency Profile</h1>
        </header>
        <AgencyEditForm
          initial={{ agencyName, contactPerson, agencyDistrict }}
        />
      </main>
    );
  }

  // ── SELF / PARENTS / null (not yet chosen) ────────────────────────────────
  const hasProfile = initial.gender !== "";
  const photos = hasProfile ? await getOwnPhotos(viewerId) : [];

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ink">
          {isWelcome ? t("welcome.title") : t("title")}
        </h1>
      </header>

      {isWelcome && (
        <Card className="mb-6 border-primary/20 bg-primary/[0.04]">
          <CardBody>
            <p className="text-sm text-ink/80">{t("welcome.body")}</p>
          </CardBody>
        </Card>
      )}

      {hasProfile ? (
        <div className="mb-6">
          <PhotoManager photos={photos} maxPhotos={MAX_PHOTOS} />
        </div>
      ) : (
        <Card className="mb-6 border-ink/10">
          <CardBody>
            <p className="text-sm text-ink/70">{t("photos.needProfile")}</p>
          </CardBody>
        </Card>
      )}

      <ProfileEditForm initial={initial} />
    </main>
  );
}
