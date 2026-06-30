"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AgencyEditForm } from "@/components/profile/AgencyEditForm";
import { AddClientModal } from "@/components/media/AddClientModal";
import { AgencyLogoUpload, AgencyVerificationCard } from "@/components/media/AgencyVerificationCard";
import { UsersIcon, CheckCircleIcon, ClockIcon } from "@/components/ui/icons";
import type { MediaDashboardData, AgencyClientSummary } from "@/lib/data/mediaDashboard";

function CompletionBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ink/10">
        <div
          className="h-full rounded-full bg-success transition-all"
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs text-muted">{score}%</span>
    </div>
  );
}

function ClientRow({
  client,
  t,
  onEdit,
}: {
  client: AgencyClientSummary;
  t: ReturnType<typeof useTranslations<"MediaDashboard">>;
  onEdit: (id: string) => void;
}) {
  const isActive = client.completionScore > 30 && client.fullName !== "—";
  const location =
    [client.upazila, client.district].filter(Boolean).join(", ") || "—";

  return (
    <tr className="border-t border-hairline">
      <td className="py-3 pr-4">
        <p className="text-sm font-semibold text-ink">{client.fullName}</p>
        <p className="text-xs text-muted">{client.gender}</p>
      </td>
      <td className="py-3 pr-4 text-sm text-ink/70">{location}</td>
      <td className="py-3 pr-4">
        <CompletionBar score={client.completionScore} />
      </td>
      <td className="py-3 pr-4">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
            isActive ? "bg-success/10 text-success" : "bg-ink/5 text-ink/50"
          }`}
        >
          {isActive ? t("statusLabel.active") : t("statusLabel.incomplete")}
        </span>
      </td>
      <td className="py-3">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onEdit(client.id)}
        >
          {t("editClient")}
        </Button>
      </td>
    </tr>
  );
}

interface Props {
  data: MediaDashboardData;
}

export function MediaDashboard({ data }: Props) {
  const t = useTranslations("MediaDashboard");
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  function handleEditClient(clientId: string) {
    router.push(`/profile/edit?clientId=${clientId}`);
  }
  // Track logo URL locally so the avatar updates instantly after upload.
  const [logoUrl, setLogoUrl] = useState(data.agencyLogoUrl);

  const agencyInitial = {
    agencyName: data.agencyName,
    contactPerson: data.contactPerson,
    agencyDistrict: data.agencyDistrict,
  };

  return (
    <div className="space-y-6">
      {/* ── Agency header ──────────────────────────────────────────── */}
      <Card>
        <CardBody>
          <div className="flex items-center gap-5">
            <AgencyLogoUpload
              initialLogoUrl={logoUrl}
              agencyName={data.agencyName}
              onLogoChange={setLogoUrl}
            />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-bold text-ink">
                {data.agencyName || "Your Agency"}
              </h2>
              {data.contactPerson && (
                <p className="text-sm text-muted">Contact: {data.contactPerson}</p>
              )}
              {data.agencyDistrict && (
                <p className="text-xs text-muted">{data.agencyDistrict}</p>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ── Stats row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center gap-1 rounded-card border border-hairline bg-canvas p-4 text-center">
          <UsersIcon width={20} height={20} className="text-primary" />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t("stats.total")}
          </p>
          <p className="text-2xl font-bold text-ink">{data.totalCount}</p>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-card border border-hairline bg-canvas p-4 text-center">
          <CheckCircleIcon width={20} height={20} className="text-success" />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t("stats.active")}
          </p>
          <p className="text-2xl font-bold text-success">{data.activeCount}</p>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-card border border-hairline bg-canvas p-4 text-center">
          <ClockIcon width={20} height={20} className="text-amber-500" />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t("stats.pending")}
          </p>
          <p className="text-2xl font-bold text-amber-600">{data.incompleteCount}</p>
        </div>
      </div>

      {/* ── Verification card ─────────────────────────────────────── */}
      <AgencyVerificationCard
        initialStatus={data.agencyVerificationStatus}
        hasTradeLicense={data.hasTradeLicense}
        isMobileVerified={data.isMobileVerified}
      />

      {/* ── Client profiles table ──────────────────────────────────── */}
      <Card>
        <CardBody>
          <div className="mb-4 flex items-center justify-between gap-3">
            <CardTitle>{t("title")}</CardTitle>
            <Button size="sm" onClick={() => setModalOpen(true)}>
              + {t("addClient")}
            </Button>
          </div>
          <p className="mb-4 text-xs text-muted">{t("subtitle")}</p>

          {data.clients.length === 0 ? (
            <div className="rounded-card border border-dashed border-hairline bg-canvas py-10 text-center">
              <UsersIcon width={32} height={32} className="mx-auto mb-3 text-ink/20" />
              <p className="text-sm text-muted">{t("noClients")}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-4"
                onClick={() => setModalOpen(true)}
              >
                + {t("addClient")}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    {(["name", "location", "completion", "status", "actions"] as const).map(
                      (col) => (
                        <th
                          key={col}
                          className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted"
                        >
                          {t(`table.${col}`)}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {data.clients.map((client) => (
                    <ClientRow key={client.id} client={client} t={t} onEdit={handleEditClient} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* ── Agency settings ────────────────────────────────────────── */}
      <Card>
        <CardBody>
          <CardTitle className="mb-4">{t("agencyInfo")}</CardTitle>
          <AgencyEditForm initial={agencyInitial} />
        </CardBody>
      </Card>

      <AddClientModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
