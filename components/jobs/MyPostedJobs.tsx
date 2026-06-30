"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { reviewApplication } from "@/lib/actions/jobs";
import type { MyJobPost } from "@/lib/data/jobs";

interface MyPostedJobsProps {
  jobs: MyJobPost[];
}

const JOB_STATUS_BADGE: Record<
  MyJobPost["status"],
  { label: string; variant: "verified" | "neutral" | "outline" }
> = {
  OPEN: { label: "Open", variant: "verified" },
  ASSIGNED: { label: "Assigned", variant: "neutral" },
  CLOSED: { label: "Closed", variant: "outline" },
};

const APP_STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  ACCEPTED: "bg-success/10 text-success",
  REJECTED: "bg-red-50 text-red-700",
};

function ApplicationRow({
  app,
  jobStatus,
}: {
  app: MyJobPost["applications"][number];
  jobStatus: MyJobPost["status"];
}) {
  const [isPending, startTransition] = useTransition();
  const [localStatus, setLocalStatus] = useState(app.status);

  function decide(decision: "ACCEPTED" | "REJECTED") {
    startTransition(async () => {
      const result = await reviewApplication(app.id, decision);
      if (result.ok) setLocalStatus(decision);
    });
  }

  const canReview = localStatus === "PENDING" && jobStatus === "OPEN";

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-hairline bg-canvas px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-ink">{app.agentEmail}</p>
        <p className="text-xs text-muted">
          Bid: ৳{(app.bidAmount / 100).toLocaleString("en-BD")} · {app.estimatedDeliveryDays} day
          {app.estimatedDeliveryDays !== 1 ? "s" : ""}
          {app.note ? ` · "${app.note}"` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${APP_STATUS_STYLE[localStatus]}`}
        >
          {localStatus.charAt(0) + localStatus.slice(1).toLowerCase()}
        </span>
        {canReview && (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => decide("REJECTED")}
            >
              Reject
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={isPending}
              onClick={() => decide("ACCEPTED")}
            >
              Accept
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function MyPostedJobs({ jobs }: MyPostedJobsProps) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-hairline py-10 text-center">
        <p className="text-sm font-semibold text-ink">No jobs posted yet</p>
        <p className="mt-1 text-xs text-muted">
          Jobs you post will appear here along with agent applications.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => {
        const { label, variant } = JOB_STATUS_BADGE[job.status];
        return (
          <div
            key={job.id}
            className="rounded-card border border-hairline bg-surface p-5 shadow-card"
          >
            {/* Job header */}
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-ink">{job.title}</h3>
                <p className="mt-0.5 text-xs text-muted">
                  {job.targetDistrict} · Budget ৳
                  {(job.budgetAmount / 100).toLocaleString("en-BD")} ·{" "}
                  {new Date(job.createdAt).toLocaleDateString("en-BD", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <Badge variant={variant}>{label}</Badge>
            </div>

            {/* Applications */}
            {job.applications.length === 0 ? (
              <p className="text-xs text-muted italic">
                No applications yet.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-ink/40">
                  {job.applications.length} Application
                  {job.applications.length !== 1 ? "s" : ""}
                </p>
                {job.applications.map((app) => (
                  <ApplicationRow
                    key={app.id}
                    app={app}
                    jobStatus={job.status}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
