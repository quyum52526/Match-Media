import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireViewerId } from "@/lib/session";
import { getRoleEntitlements } from "@/lib/roleContext";
import {
  AgencyApplicationForm,
  AgentApplicationForm,
} from "@/components/profile/RoleApplicationForms";
import { Container } from "@/components/ui/Container";
import { Link } from "@/i18n/navigation";

export const metadata = {
  title: "Service application",
};

/** Mobile numbers are stored as 8801XXXXXXXXX; show the national form. */
function displayMobile(mobile: string | null): string {
  if (!mobile) return "";
  return mobile.startsWith("88") ? mobile.slice(2) : mobile;
}

/**
 * The application form for one extra service.
 *
 * A service this account already holds, or already has under review, sends the
 * person back to the overview rather than showing a form whose submission the
 * server would refuse.
 */
export default async function RoleApplicationPage({
  params,
}: {
  params: Promise<{ locale: string; service: string }>;
}) {
  const { locale, service } = await params;
  setRequestLocale(locale);

  if (service !== "agency" && service !== "agent") notFound();

  const viewerId = await requireViewerId(`/${locale}/login`);
  const [user, entitlements, t] = await Promise.all([
    prisma.user.findUnique({
      where: { id: viewerId },
      select: {
        mobile: true,
        contactPerson: true,
        profile: { select: { fullName: true } },
      },
    }),
    getRoleEntitlements(viewerId),
    getTranslations("ExpandAccount"),
  ]);

  const state = service === "agency" ? entitlements.agency : entitlements.agent;
  if (state === "APPROVED" || state === "PENDING") {
    redirect({ href: "/profile/expand", locale });
  }

  const applicant = {
    fullName: user?.profile?.fullName?.trim() || user?.contactPerson?.trim() || "",
    mobile: displayMobile(user?.mobile ?? null),
  };

  return (
    <Container className="py-8 sm:py-10">
      <div className="mx-auto max-w-2xl space-y-4">
        <Link
          href="/profile/expand"
          className="text-sm font-medium text-primary hover:underline"
        >
          ← {t("backToServices")}
        </Link>
        {service === "agency" ? (
          <AgencyApplicationForm applicant={applicant} />
        ) : (
          <AgentApplicationForm applicant={applicant} />
        )}
      </div>
    </Container>
  );
}
