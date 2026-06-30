"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AddChildModal } from "@/components/guardian/AddChildModal";
import { UsersIcon, CheckCircleIcon, ClockIcon } from "@/components/ui/icons";
import type { GuardianDashboardData, GuardianChildSummary } from "@/lib/data/guardianDashboard";

function CompletionBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ink/10">
        <div className="h-full rounded-full bg-success transition-all" style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-muted">{score}%</span>
    </div>
  );
}

function ChildRow({
  child,
  t,
  onEdit,
}: {
  child: GuardianChildSummary;
  t: ReturnType<typeof useTranslations<"GuardianDashboard">>;
  onEdit: (id: string) => void;
}) {
  const isActive = child.completionScore > 30 && child.fullName !== "—";
  const location = [child.upazila, child.district].filter(Boolean).join(", ") || "—";

  return (
    <tr className="border-t border-hairline">
      <td className="py-3 pr-4">
        <p className="text-sm font-semibold text-ink">{child.fullName}</p>
        <p className="text-xs text-muted">{child.gender}</p>
      </td>
      <td className="py-3 pr-4 text-sm text-ink/70">{location}</td>
      <td className="py-3 pr-4">
        <CompletionBar score={child.completionScore} />
      </td>
      <td className="py-3 pr-4">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
          isActive ? "bg-success/10 text-success" : "bg-ink/5 text-ink/50"
        }`}>
          {isActive ? t("statusLabel.active") : t("statusLabel.incomplete")}
        </span>
      </td>
      <td className="py-3">
        <Button size="sm" variant="outline" onClick={() => onEdit(child.id)}>
          {t("editClient")}
        </Button>
      </td>
    </tr>
  );
}

const MAX_CHILDREN = 3;

export function GuardianDashboard({ data }: { data: GuardianDashboardData }) {
  const t = useTranslations("GuardianDashboard");
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const atLimit = data.totalCount >= MAX_CHILDREN;

  function handleEditChild(childId: string) {
    router.push(`/profile/edit?clientId=${childId}`);
  }

  return (
    <div className="space-y-6">
      {/* ── Stats row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center gap-1 rounded-card border border-hairline bg-canvas p-4 text-center">
          <UsersIcon width={20} height={20} className="text-primary" />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("stats.total")}</p>
          <p className="text-2xl font-bold text-ink">{data.totalCount}</p>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-card border border-hairline bg-canvas p-4 text-center">
          <CheckCircleIcon width={20} height={20} className="text-success" />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("stats.active")}</p>
          <p className="text-2xl font-bold text-success">{data.activeCount}</p>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-card border border-hairline bg-canvas p-4 text-center">
          <ClockIcon width={20} height={20} className="text-amber-500" />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("stats.pending")}</p>
          <p className="text-2xl font-bold text-amber-600">{data.incompleteCount}</p>
        </div>
      </div>

      {/* ── Child profiles table ────────────────────────────── */}
      <Card>
        <CardBody>
          <div className="mb-4 flex items-center justify-between gap-3">
            <CardTitle>{t("title")}</CardTitle>
            <div className="flex flex-col items-end gap-1">
              <Button size="sm" disabled={atLimit} onClick={() => setModalOpen(true)}>
                + {t("addChild")}
              </Button>
              {atLimit && (
                <p className="text-xs text-muted">Maximum limit of {MAX_CHILDREN} profiles reached</p>
              )}
            </div>
          </div>
          <p className="mb-4 text-xs text-muted">{t("subtitle")}</p>

          {data.children.length === 0 ? (
            <div className="rounded-card border border-dashed border-hairline bg-canvas py-10 text-center">
              <UsersIcon width={32} height={32} className="mx-auto mb-3 text-ink/20" />
              <p className="text-sm text-muted">{t("noChildren")}</p>
              <Button size="sm" variant="outline" className="mt-4" disabled={atLimit} onClick={() => setModalOpen(true)}>
                + {t("addChild")}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    {(["name", "location", "completion", "status", "actions"] as const).map((col) => (
                      <th key={col} className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted">
                        {t(`table.${col}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.children.map((child) => (
                    <ChildRow key={child.id} child={child} t={t} onEdit={handleEditChild} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* ── Account info ───────────────────────────────────── */}
      <Card>
        <CardBody>
          <CardTitle className="mb-3">{t("parentInfo")}</CardTitle>
          <p className="text-sm text-ink/70">{data.email}</p>
          {data.mobile && <p className="text-sm text-ink/70">{data.mobile}</p>}
        </CardBody>
      </Card>

      <AddChildModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
