"use client";

import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { MapPinIcon } from "@/components/ui/icons";
import type { getAgentApplications } from "@/lib/data/jobs";

type ApplicationList = Awaited<ReturnType<typeof getAgentApplications>>;

interface MyApplicationsProps {
  applications: ApplicationList;
}

const APP_STATUS: Record<
  ApplicationList[number]["status"],
  { label: string; variant: "verified" | "neutral" | "outline" }
> = {
  PENDING: { label: "Pending", variant: "outline" },
  ACCEPTED: { label: "Accepted", variant: "verified" },
  REJECTED: { label: "Rejected", variant: "neutral" },
};

export function MyApplications({ applications }: MyApplicationsProps) {
  if (applications.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-hairline py-10 text-center">
        <p className="text-sm font-semibold text-ink">No applications yet</p>
        <p className="mt-1 text-xs text-muted">
          Jobs you apply for will appear here.
        </p>
        <Link
          href="/jobs"
          className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
        >
          Browse jobs →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {applications.map((app) => {
        const { label, variant } = APP_STATUS[app.status];
        return (
          <div
            key={app.id}
            className="flex flex-col gap-2 rounded-card border border-hairline bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-1">
              <p className="text-sm font-semibold text-ink">{app.job.title}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                <span className="flex items-center gap-1">
                  <MapPinIcon width={12} height={12} />
                  {app.job.targetDistrict}
                </span>
                <span>
                  Your bid: ৳{(app.bidAmount / 100).toLocaleString("en-BD")}
                </span>
                <span>
                  {app.estimatedDeliveryDays} day
                  {app.estimatedDeliveryDays !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <Badge variant={variant}>{label}</Badge>
          </div>
        );
      })}
    </div>
  );
}
