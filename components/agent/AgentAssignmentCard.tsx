"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MapPinIcon, ClipboardIcon, CheckCircleIcon, ClockIcon } from "@/components/ui/icons";
import { startAssignment, submitAssignment } from "@/lib/actions/agentAssignments";
import type { AssignmentSummary } from "@/lib/data/agentDashboard";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  SUBMITTED: "bg-violet-50 text-violet-700 border-violet-200",
  VERIFIED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-ink/5 text-ink/50 border-hairline",
};

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTaka(poisha: number) {
  return `৳${(poisha / 100).toLocaleString("en-BD")}`;
}

export function AgentAssignmentCard({ a }: { a: AssignmentSummary }) {
  const t = useTranslations("AgentDashboard");
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [note, setNote] = useState<string>(a.agentNote ?? "");
  const [error, setError] = useState("");

  function handleStart() {
    startTransition(async () => {
      await startAssignment(a.id);
    });
  }

  function handleSubmit() {
    startTransition(async () => {
      const res = await submitAssignment(a.id, note);
      if (res && "error" in res) {
        setError(res.error ?? "Unknown error");
      } else {
        setShowForm(false);
        setError("");
      }
    });
  }

  const statusClass = STATUS_COLORS[a.status] ?? STATUS_COLORS.CANCELLED;
  const isActive = a.status !== "VERIFIED" && a.status !== "CANCELLED";

  return (
    <Card className={isActive ? "" : "opacity-70"}>
      <CardBody className="space-y-3">
        {/* Header: name + status badge */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-ink">{a.candidateName}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
              <MapPinIcon width={12} height={12} />
              {[a.candidateUpazila, a.candidateDistrict].filter(Boolean).join(", ") || "—"}
            </p>
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusClass}`}
          >
            {t(`status.${a.status}`)}
          </span>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span className="flex items-center gap-1">
            <ClockIcon width={12} height={12} />
            {t("assignedOn")}: {formatDate(a.assignedAt)}
          </span>
          {a.completedAt && (
            <span className="flex items-center gap-1">
              <CheckCircleIcon width={12} height={12} />
              {formatDate(a.completedAt)}
            </span>
          )}
          <span className="ml-auto font-semibold text-success">
            {formatTaka(a.agentShare)}
          </span>
        </div>

        {/* Agent's submitted note (read-only after SUBMITTED/VERIFIED) */}
        {a.agentNote && a.status !== "IN_PROGRESS" && (
          <div className="rounded-card border border-hairline bg-canvas p-3 text-xs text-ink/70">
            <p className="mb-1 flex items-center gap-1 font-semibold uppercase tracking-wide text-muted">
              <ClipboardIcon width={11} height={11} />
              Report
            </p>
            {a.agentNote}
          </div>
        )}

        {/* Actions */}
        {a.status === "PENDING" && (
          <Button size="sm" variant="outline" onClick={handleStart} disabled={isPending}>
            {t("actions.startWork")}
          </Button>
        )}

        {a.status === "IN_PROGRESS" && !showForm && (
          <Button size="sm" variant="primary" onClick={() => setShowForm(true)}>
            {t("actions.submitReport")}
          </Button>
        )}

        {a.status === "IN_PROGRESS" && showForm && (
          <div className="space-y-2">
            <textarea
              className="w-full rounded-card border border-hairline bg-canvas p-3 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none"
              rows={4}
              placeholder={t("actions.reportPlaceholder")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" variant="primary" onClick={handleSubmit} disabled={isPending || !note.trim()}>
                {t("actions.submitConfirm")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setError(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
