import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { PhotoManager } from "@/components/profile/PhotoManager";
import { AgentDashboard } from "@/components/agent/AgentDashboard";
import { MediaDashboard } from "@/components/media/MediaDashboard";
import { GuardianDashboard } from "@/components/guardian/GuardianDashboard";
import { Card, CardBody } from "@/components/ui/Card";
import { getEditableProfile, getClientEditableProfile } from "@/lib/data/profiles";
import { getAgentDashboardData } from "@/lib/data/agentDashboard";
import { getMediaDashboardData } from "@/lib/data/mediaDashboard";
import { getGuardianDashboardData } from "@/lib/data/guardianDashboard";
import { getOwnPhotos, getClientPhotos } from "@/lib/data/photos";
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
      role: (user as { role?: string | null })?.role ?? null,
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
      role: null,
    };
  }
}

export default async function ProfileEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ welcome?: string; clientId?: string }>;
}) {
  const { locale } = await params;
  const { welcome, clientId } = await searchParams;
  setRequestLocale(locale);
  const viewerId = await requireViewerId(`/${locale}/login`);
  const t = await getTranslations("ProfileEdit");
  const isWelcome = welcome === "1";

  const [userMeta, initial] = await Promise.all([
    getUserMeta(viewerId),
    getEditableProfile(viewerId),
  ]);

  const { category, agencyName, contactPerson, agencyDistrict, isVerified, email, mobile, role } =
    userMeta;

  // Guard: users who haven't completed onboarding cannot access the edit page.
  // Admins are exempt — they don't have matrimonial profiles.
  if (!category && role !== "ADMIN") {
    redirect(locale === "en" ? "/en/onboarding" : "/onboarding");
  }

  // ── AGENT ─────────────────────────────────────────────────────────────────
  if (category === "AGENT") {
    const agentData = await getAgentDashboardData(viewerId);
    return (
      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Verification Agent
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink">My Account</h1>
        </header>
        <AgentDashboard data={agentData} email={email} mobile={mobile} />
      </main>
    );
  }

  // ── MEDIA — client edit ────────────────────────────────────────────────────
  // When a clientId is provided, the agency is editing a specific client profile
  // rather than viewing their own dashboard.
  if (category === "MEDIA" && clientId) {
    const [clientProfile, clientPhotos] = await Promise.all([
      getClientEditableProfile(viewerId, clientId),
      getClientPhotos(viewerId, clientId),
    ]);

    // Ownership check failed — profile doesn't exist or belongs to another agency.
    if (!clientProfile) {
      redirect(locale === "en" ? "/en/profile/edit" : "/profile/edit");
    }

    const clientName = clientProfile.fullName || "Client Profile";

    return (
      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Media Agency · Client
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink">{clientName}</h1>
          <a
            href={locale === "en" ? "/en/profile/edit" : "/profile/edit"}
            className="mt-1 inline-block text-sm text-primary underline underline-offset-2"
          >
            ← Back to Dashboard
          </a>
        </header>

        <div className="mb-6">
          <PhotoManager photos={clientPhotos} maxPhotos={MAX_PHOTOS} clientId={clientId} />
        </div>

        <ProfileEditForm initial={clientProfile} clientId={clientId} />
      </main>
    );
  }

  // ── MEDIA — agency dashboard ───────────────────────────────────────────────
  if (category === "MEDIA") {
    const mediaData = await getMediaDashboardData(viewerId);
    return (
      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Media Agency
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink">
            {agencyName || "Agency Dashboard"}
          </h1>
        </header>
        <MediaDashboard data={mediaData} />
      </main>
    );
  }

  // ── PARENTS — edit a specific child profile ────────────────────────────────
  if (category === "PARENTS" && clientId) {
    const [clientProfile, clientPhotos] = await Promise.all([
      getClientEditableProfile(viewerId, clientId),
      getClientPhotos(viewerId, clientId),
    ]);

    if (!clientProfile) {
      redirect(locale === "en" ? "/en/profile/edit" : "/profile/edit");
    }

    const childName = clientProfile.fullName || "Child Profile";

    return (
      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Guardian · Child Profile
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink">{childName}</h1>
          <a
            href={locale === "en" ? "/en/profile/edit" : "/profile/edit"}
            className="mt-1 inline-block text-sm text-primary underline underline-offset-2"
          >
            ← Back to Dashboard
          </a>
        </header>

        <div className="mb-6">
          <PhotoManager photos={clientPhotos} maxPhotos={MAX_PHOTOS} clientId={clientId} />
        </div>

        <ProfileEditForm initial={clientProfile} clientId={clientId} />
      </main>
    );
  }

  // ── PARENTS — guardian dashboard ───────────────────────────────────────────
  if (category === "PARENTS") {
    const guardianData = await getGuardianDashboardData(viewerId);
    return (
      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Guardian / Parent
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink">My Dashboard</h1>
        </header>
        <GuardianDashboard data={guardianData} />
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
