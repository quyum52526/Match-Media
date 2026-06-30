"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MapPinIcon, ClockIcon, BriefcaseIcon } from "@/components/ui/icons";
import { ApplyModal } from "./ApplyModal";
import type { JobSummary } from "@/lib/data/jobs";

interface JobCardProps {
  job: JobSummary;
}

const STATUS_BADGE: Record<
  JobSummary["status"],
  { label: string; variant: "verified" | "neutral" | "outline" }
> = {
  OPEN: { label: "Open", variant: "verified" },
  ASSIGNED: { label: "Assigned", variant: "neutral" },
  CLOSED: { label: "Closed", variant: "outline" },
};

const APP_STATUS_STYLE: Record<
  NonNullable<JobSummary["myApplication"]>["status"],
  string
> = {
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  ACCEPTED: "bg-success/10 text-success border border-success/20",
  REJECTED: "bg-red-50 text-red-700 border border-red-200",
};

export function JobCard({ job }: JobCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const budgetBdt = (job.budgetAmount / 100).toLocaleString("en-BD");
  const { label, variant } = STATUS_BADGE[job.status];

  return (
    <>
      <article className="flex flex-col gap-3 rounded-card border border-hairline bg-surface p-5 shadow-card transition-shadow hover:shadow-md">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-ink leading-snug">
            {job.title}
          </h3>
          <Badge variant={variant} className="shrink-0">
            {label}
          </Badge>
        </div>

        {/* Description */}
        <p className="text-sm text-muted line-clamp-2">{job.description}</p>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink/60">
          <span className="flex items-center gap-1">
            <MapPinIcon width={13} height={13} />
            {job.targetDistrict}
          </span>
          <span className="flex items-center gap-1">
            <BriefcaseIcon width={13} height={13} />
            Budget: <span className="font-semibold text-ink">৳{budgetBdt}</span>
          </span>
          <span className="flex items-center gap-1">
            <ClockIcon width={13} height={13} />
            {new Date(job.createdAt).toLocaleDateString("en-BD", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
          <span className="text-ink/40">
            {job.applicationCount} applicant{job.applicationCount !== 1 ? "s" : ""}
          </span>
        </div>

        {/* My application status */}
        {job.myApplication && (
          <div
            className={`rounded-xl px-3 py-2 text-xs font-medium ${APP_STATUS_STYLE[job.myApplication.status]}`}
          >
            Your bid: ৳{(job.myApplication.bidAmount / 100).toLocaleString("en-BD")} ·{" "}
            {job.myApplication.estimatedDeliveryDays} day
            {job.myApplication.estimatedDeliveryDays !== 1 ? "s" : ""} ·{" "}
            Status:{" "}
            <span className="capitalize">
              {job.myApplication.status.toLowerCase()}
            </span>
          </div>
        )}

        {/* Apply button */}
        {job.status === "OPEN" && !job.myApplication && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setModalOpen(true)}
            className="mt-auto self-start"
          >
            Apply
          </Button>
        )}
      </article>

      <ApplyModal
        jobId={job.id}
        jobTitle={job.title}
        budgetAmount={job.budgetAmount}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
