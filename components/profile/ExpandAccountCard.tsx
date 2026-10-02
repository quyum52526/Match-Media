"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import type { RoleState } from "@/lib/roleContext";

/**
 * "Expand account" entry point: pick an extra service and continue to its
 * application form.
 *
 * A service the account already holds, or already has under review, is shown as
 * a status line instead of being offered again — the options list only contains
 * what this person can actually apply for. The server action re-checks both
 * conditions, so a stale page cannot submit a duplicate.
 */
export function ExpandAccountCard({
  agency,
  agent,
  agencyName,
  agencyRejectionReason,
  agentRejectionReason,
}: {
  agency: RoleState;
  agent: RoleState;
  agencyName: string | null;
  agencyRejectionReason?: string | null;
  agentRejectionReason?: string | null;
}) {
  const t = useTranslations("ExpandAccount");
  const router = useRouter();
  const [service, setService] = useState("");

  // REJECTED is applyable again: the reason says what to fix.
  const canApplyAgency = agency === "NONE" || agency === "REJECTED";
  const canApplyAgent = agent === "NONE" || agent === "REJECTED";

  const options = [
    canApplyAgency ? { value: "agency", label: t("options.agency") } : null,
    canApplyAgent ? { value: "agent", label: t("options.agent") } : null,
  ].filter(Boolean) as { value: string; label: string }[];

  return (
    <Card>
      <CardBody className="space-y-4">
        <div>
          <CardTitle>{t("title")}</CardTitle>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </div>

        {/* Current standing of each service, when there is something to say. */}
        <div className="space-y-2">
          {agency === "APPROVED" && (
            <StatusLine tone="ok">
              {t("status.agencyApproved", { name: agencyName ?? "" })}
            </StatusLine>
          )}
          {agency === "PENDING" && (
            <StatusLine tone="pending">{t("status.agencyPending")}</StatusLine>
          )}
          {agency === "REJECTED" && (
            <StatusLine tone="bad">
              {t("status.agencyRejected")}
              {agencyRejectionReason ? ` — ${agencyRejectionReason}` : ""}
            </StatusLine>
          )}
          {agent === "APPROVED" && (
            <StatusLine tone="ok">{t("status.agentApproved")}</StatusLine>
          )}
          {agent === "PENDING" && (
            <StatusLine tone="pending">{t("status.agentPending")}</StatusLine>
          )}
          {agent === "REJECTED" && (
            <StatusLine tone="bad">
              {t("status.agentRejected")}
              {agentRejectionReason ? ` — ${agentRejectionReason}` : ""}
            </StatusLine>
          )}
        </div>

        {options.length > 0 ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <label
                htmlFor="expandService"
                className="text-sm font-medium text-ink"
              >
                {t("selectLabel")}
              </label>
              <select
                id="expandService"
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="h-11 w-full rounded-xl border border-hairline bg-white px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              >
                <option value="">{t("selectPlaceholder")}</option>
                {options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              disabled={!service}
              onClick={() => router.push(`/profile/expand/${service}`)}
            >
              {t("continue")}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted">{t("nothingToApplyFor")}</p>
        )}
      </CardBody>
    </Card>
  );
}

function StatusLine({
  tone,
  children,
}: {
  tone: "ok" | "pending" | "bad";
  children: React.ReactNode;
}) {
  const styles = {
    ok: "border-success/30 bg-success/10 text-success",
    pending: "border-amber-300/50 bg-amber-50 text-amber-700",
    bad: "border-red-200 bg-red-50 text-red-700",
  }[tone];
  return (
    <p className={`rounded-card border px-3 py-2 text-sm ${styles}`}>
      {children}
    </p>
  );
}
