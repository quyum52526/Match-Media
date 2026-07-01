import { getTranslations } from "next-intl/server";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { AgentStatusCard } from "@/components/profile/AgentStatusCard";
import { AgentAssignmentCard } from "@/components/agent/AgentAssignmentCard";
import { BanknoteIcon, ClockIcon, CheckCircleIcon } from "@/components/ui/icons";
import type { AgentDashboardData } from "@/lib/data/agentDashboard";

function formatTaka(poisha: number) {
  return `৳${(poisha / 100).toLocaleString("en-BD")}`;
}

export async function AgentDashboard({
  data,
  email,
  mobile,
}: {
  data: AgentDashboardData;
  email: string;
  mobile: string | null;
}) {
  const t = await getTranslations("AgentDashboard");

  const active = data.assignments.filter(
    (a) => a.status === "PENDING" || a.status === "IN_PROGRESS" || a.status === "SUBMITTED",
  );
  const done = data.assignments.filter(
    (a) => a.status === "VERIFIED" || a.status === "CANCELLED",
  );

  return (
    <div className="space-y-6">
      {/* Verification status + account info */}
      <AgentStatusCard
        isVerified={data.isVerified}
        email={email}
        mobile={mobile}
        avatarUrl={data.avatarUrl}
      />

      {/* Earnings summary chips */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center gap-1 rounded-card border border-hairline bg-canvas p-4 text-center">
          <BanknoteIcon width={20} height={20} className="text-success" />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t("totalEarned")}
          </p>
          <p className="text-lg font-bold text-success">{formatTaka(data.totalEarned)}</p>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-card border border-hairline bg-canvas p-4 text-center">
          <ClockIcon width={20} height={20} className="text-amber-500" />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t("pending")}
          </p>
          <p className="text-lg font-bold text-ink">{data.pendingCount}</p>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-card border border-hairline bg-canvas p-4 text-center">
          <CheckCircleIcon width={20} height={20} className="text-primary" />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t("completed")}
          </p>
          <p className="text-lg font-bold text-ink">{data.completedCount}</p>
        </div>
      </div>

      {/* Active assignments */}
      <Card>
        <CardBody className="space-y-3">
          <CardTitle>{t("title")}</CardTitle>
          <p className="text-xs text-muted">{t("subtitle")}</p>

          {active.length === 0 && done.length === 0 ? (
            <p className="rounded-card border border-hairline bg-canvas p-4 text-sm text-muted">
              {t("noAssignments")}
            </p>
          ) : (
            <div className="space-y-3">
              {active.map((a) => (
                <AgentAssignmentCard key={a.id} a={a} />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Completed / cancelled assignments */}
      {done.length > 0 && (
        <Card>
          <CardBody className="space-y-3">
            <CardTitle>{t("completed")}</CardTitle>
            <div className="space-y-3">
              {done.map((a) => (
                <AgentAssignmentCard key={a.id} a={a} />
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
