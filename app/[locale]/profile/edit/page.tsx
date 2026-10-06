import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthBackground } from "@/components/auth/AuthBackground";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { PartnerPreferencesForm } from "@/components/profile/PartnerPreferencesForm";
import { PhotoManager } from "@/components/profile/PhotoManager";
import { AgentDashboard } from "@/components/agent/AgentDashboard";
import { MediaDashboard } from "@/components/media/MediaDashboard";
import { GuardianDashboard } from "@/components/guardian/GuardianDashboard";
import { Card, CardBody } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { getEditableProfile, getClientEditableProfile } from "@/lib/data/profiles";
import { getEditablePartnerPreference } from "@/lib/data/preferences";
import { getAgentDashboardData } from "@/lib/data/agentDashboard";
import { getMediaDashboardData } from "@/lib/data/mediaDashboard";
import { getGuardianDashboardData } from "@/lib/data/guardianDashboard";
import { getOwnPhotos, getClientPhotos } from "@/lib/data/photos";
import { MAX_PHOTOS } from "@/lib/storage/images";
import { requireViewerId } from "@/lib/session";
import { isEmailGateCleared } from "@/lib/emailVerification";
import { getRoleEntitlements } from "@/lib/roleContext";
import { getOwnApplications } from "@/lib/data/roleApplications";
import { ExpandAccountCard } from "@/components/profile/ExpandAccountCard";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/rbac";

export const metadata = {
  title: "Edit Profile",
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
  // MEDIA and AGENT signups land here rather than in the wizard, so the email
  // gate has to cover this route too — otherwise half the categories skip it.
  if (!(await isEmailGateCleared(viewerId))) {
    redirect(locale === "en" ? "/en/verify-email" : "/verify-email");
  }
  const t = await getTranslations("ProfileEdit");
  const isWelcome = welcome === "1";

  // Every branch of this route shares the same subtle brand background (bg-03),
  // keeping the page visually consistent with the auth forms.
  const withBg = (node: ReactNode) => (
    <AuthBackground bgImage="/match-media-bg-03-b.svg">{node}</AuthBackground>
  );

  const [userMeta, initial] = await Promise.all([
    getUserMeta(viewerId),
    getEditableProfile(viewerId),
  ]);

  const { category, agencyName, contactPerson, agencyDistrict, isVerified, email, mobile, role } =
    userMeta;

  // Guard: users who haven't completed onboarding cannot access the edit page.
  // Admins are exempt — they don't have matrimonial profiles.
  if (!category && !isAdminRole(role)) {
    redirect(locale === "en" ? "/en/onboarding" : "/onboarding");
  }

  // ── AGENT ─────────────────────────────────────────────────────────────────
  if (category === "AGENT") {
    const agentData = await getAgentDashboardData(viewerId);
    return withBg(
      <Container className="py-6 sm:py-10"><div className="mx-auto max-w-2xl">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Verification Agent
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink">My Account</h1>
        </header>
        <AgentDashboard data={agentData} email={email} mobile={mobile} />
      </div></Container>
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

    return withBg(
      <Container className="py-6 sm:py-10"><div className="mx-auto max-w-2xl">
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
      </div></Container>
    );
  }

  // ── MEDIA — agency dashboard ───────────────────────────────────────────────
  if (category === "MEDIA") {
    const mediaData = await getMediaDashboardData(viewerId);
    return withBg(
      <Container className="py-6 sm:py-10"><div className="mx-auto max-w-3xl">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Media Agency
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink">
            {agencyName || "Agency Dashboard"}
          </h1>
        </header>
        <MediaDashboard data={mediaData} />
      </div></Container>
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

    return withBg(
      <Container className="py-6 sm:py-10"><div className="mx-auto max-w-2xl">
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
      </div></Container>
    );
  }

  // ── PARENTS — guardian dashboard ───────────────────────────────────────────
  if (category === "PARENTS") {
    const guardianData = await getGuardianDashboardData(viewerId);
    return withBg(
      <Container className="py-6 sm:py-10"><div className="mx-auto max-w-3xl">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Guardian / Parent
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink">My Dashboard</h1>
        </header>
        <GuardianDashboard data={guardianData} />
        <div className="mt-6">
          <ExpandAccountSection viewerId={viewerId} />
        </div>
      </div></Container>
    );
  }

  // ── SELF / PARENTS / null (not yet chosen) ────────────────────────────────
  const hasProfile = initial.gender !== "";
  const photos = hasProfile ? await getOwnPhotos(viewerId) : [];
  // Preferences hang off the Profile row, so only offer them once one exists.
  const preferences = hasProfile
    ? await getEditablePartnerPreference(viewerId)
    : null;

  return withBg(
    <Container className="py-6 sm:py-10"><div className="mx-auto max-w-2xl">
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

      {preferences && (
        <div className="mt-6">
          <PartnerPreferencesForm initial={preferences} />
        </div>
      )}

      {/* Expand account: apply to ALSO run an agency or work as a verification
          agent, on this same login. */}
      <div className="mt-6">
        <ExpandAccountSection viewerId={viewerId} />
      </div>
    </div></Container>
  );
}

/**
 * The "Expand account / additional services" card, with this account's current
 * standing for each service. Kept as its own async component so both the
 * personal and the guardian branch can drop it in without repeating the two
 * queries it needs.
 */
async function ExpandAccountSection({ viewerId }: { viewerId: string }) {
  const [entitlements, applications] = await Promise.all([
    getRoleEntitlements(viewerId),
    getOwnApplications(viewerId),
  ]);

  return (
    <ExpandAccountCard
      agency={entitlements.agency}
      agent={entitlements.agent}
      agencyName={entitlements.agencyName}
      agencyRejectionReason={applications.agency?.rejectionReason ?? null}
      agentRejectionReason={applications.agent?.rejectionReason ?? null}
    />
  );
}
