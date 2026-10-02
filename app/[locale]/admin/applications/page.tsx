import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { assertAdmin } from "@/lib/session";
import {
  getPendingAgencyApplications,
  getPendingAgentApplications,
} from "@/lib/data/roleApplications";
import { RoleApplicationsQueue } from "@/components/admin/RoleApplicationsQueue";

export const metadata = {
  title: "Role Applications · Admin · MatchMedia",
};

/**
 * Review queue for members applying to take on a second role. Approving one is
 * what grants the role — see lib/actions/adminRoleApplications.ts.
 */
export default async function AdminApplicationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const adminId = await assertAdmin();
  if (!adminId) redirect(`/${locale}/login`);

  const [agencyApplications, agentApplications] = await Promise.all([
    getPendingAgencyApplications(),
    getPendingAgentApplications(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Role Applications</h1>
        <p className="mt-1 text-sm text-muted">
          Existing members applying to also operate as a marriage media agency
          or as a verification agent. Approving grants the role on their current
          account — no second login is created.
        </p>
      </div>
      <RoleApplicationsQueue
        agencyApplications={agencyApplications}
        agentApplications={agentApplications}
      />
    </div>
  );
}
