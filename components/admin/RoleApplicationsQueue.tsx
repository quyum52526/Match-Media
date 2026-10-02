"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveAgencyApplication,
  rejectAgencyApplication,
  approveAgentApplication,
  rejectAgentApplication,
  type AdminApplicationResult,
} from "@/lib/actions/adminRoleApplications";
import { Button } from "@/components/ui/Button";
import { InboxIcon } from "@/components/ui/icons";
import type {
  PendingAgencyApplication,
  PendingAgentApplication,
} from "@/lib/data/roleApplications";

/**
 * Review queue for role applications: members asking to also operate as an
 * agency, or to work as a verification agent.
 *
 * Two tabs over one queue, because an admin works one kind at a time and the
 * documents to check differ (trade licence vs NID). Rejection requires a
 * reason — the button stays disabled until one is typed, and the action
 * refuses an empty one regardless.
 *
 * English-only, like the rest of /admin.
 */

type Tab = "AGENCY" | "AGENT";

export function RoleApplicationsQueue({
  agencyApplications,
  agentApplications,
}: {
  agencyApplications: PendingAgencyApplication[];
  agentApplications: PendingAgentApplication[];
}) {
  const [tab, setTab] = useState<Tab>(
    // Open on whichever queue has work; agency first when both do.
    agencyApplications.length === 0 && agentApplications.length > 0
      ? "AGENT"
      : "AGENCY",
  );

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <TabButton
          active={tab === "AGENCY"}
          count={agencyApplications.length}
          onClick={() => setTab("AGENCY")}
        >
          Agency applications
        </TabButton>
        <TabButton
          active={tab === "AGENT"}
          count={agentApplications.length}
          onClick={() => setTab("AGENT")}
        >
          Agent applications
        </TabButton>
      </div>

      {tab === "AGENCY" ? (
        agencyApplications.length ? (
          <div className="space-y-4">
            {agencyApplications.map((item) => (
              <AgencyRow key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <EmptyState label="No agency applications waiting for review." />
        )
      ) : agentApplications.length ? (
        <div className="space-y-4">
          {agentApplications.map((item) => (
            <AgentRow key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <EmptyState label="No agent applications waiting for review." />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

function TabButton({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-2 rounded-pill px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-white"
          : "bg-canvas text-ink/70 hover:bg-ink/5 hover:text-ink"
      }`}
    >
      {children}
      {count > 0 && (
        <span
          className={`rounded-full px-1.5 text-xs font-bold ${
            active ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-hairline bg-canvas py-8 text-center">
      <InboxIcon width={28} height={28} className="text-ink/20" />
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}

/**
 * A submitted document. PDFs cannot be previewed inline, so every document is
 * a link that opens in a new tab; images get a thumbnail as well.
 */
function DocLink({ url, label }: { url: string | null; label: string }) {
  if (!url) {
    return (
      <div className="flex h-28 w-full items-center justify-center rounded-lg border border-dashed border-hairline bg-canvas text-xs text-muted">
        {label}: not provided
      </div>
    );
  }
  const isPdf = /\.pdf(\?|$)/i.test(url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={`Open ${label}`}
      className="block"
    >
      {isPdf ? (
        <div className="flex h-28 w-full items-center justify-center rounded-lg border border-hairline bg-canvas text-xs font-medium text-primary hover:bg-ink/5">
          {label} (PDF)
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={label}
          className="h-28 w-full rounded-lg border border-hairline object-cover hover:opacity-90"
        />
      )}
      <p className="mt-1 text-[11px] text-muted">{label}</p>
    </a>
  );
}

function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="text-sm text-ink">{value}</dd>
    </div>
  );
}

/** Approve / reject controls with the mandatory-reason rule. */
function Decision({
  onApprove,
  onReject,
}: {
  onApprove: () => Promise<AdminApplicationResult>;
  onReject: (reason: string) => Promise<AdminApplicationResult>;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function run(fn: () => Promise<AdminApplicationResult>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(
          result.error === "REASON_REQUIRED"
            ? "A reason is required to reject."
            : result.error === "ALREADY_REVIEWED"
              ? "This application was already reviewed."
              : result.error,
        );
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2 border-t border-hairline pt-3">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        placeholder="Reason — required to reject, shown to the applicant and emailed"
        className="w-full rounded-xl border border-hairline bg-white p-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={isPending} onClick={() => run(onApprove)}>
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending || !reason.trim()}
          onClick={() => run(() => onReject(reason))}
        >
          Reject
        </Button>
      </div>
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}

function RowShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-card border border-hairline bg-surface p-4">
      <div>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <p className="font-body text-xs text-muted">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Agency                                                              */
/* ------------------------------------------------------------------ */

function AgencyRow({ item }: { item: PendingAgencyApplication }) {
  return (
    <RowShell
      title={item.agencyName}
      subtitle={`${item.applicantName ?? "(no name)"} · ${item.email}${
        item.mobile ? ` · ${item.mobile}` : ""
      }`}
    >
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Fact label="Trade licence no." value={item.tradeLicenseNumber} />
        <Fact label="Contact person" value={item.contactPerson} />
        <Fact label="Office address" value={item.officeAddress} />
      </dl>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <DocLink url={item.tradeLicenseUrl} label="Trade licence" />
      </div>

      <Decision
        onApprove={() => approveAgencyApplication(item.id)}
        onReject={(reason) => rejectAgencyApplication(item.id, reason)}
      />
    </RowShell>
  );
}

/* ------------------------------------------------------------------ */
/* Agent                                                               */
/* ------------------------------------------------------------------ */

function AgentRow({ item }: { item: PendingAgentApplication }) {
  return (
    <RowShell
      title={item.applicantName ?? "(no name)"}
      subtitle={`${item.email}${item.mobile ? ` · ${item.mobile}` : ""}`}
    >
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Fact label="NID number" value={item.nidNumber} />
        <Fact
          label="Operating districts"
          value={item.operatingDistricts.join(", ")}
        />
      </dl>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <DocLink url={item.nidFrontUrl} label="NID front" />
        <DocLink url={item.nidBackUrl} label="NID back" />
        <DocLink url={item.policeVerificationUrl} label="Police verification" />
      </div>

      <Decision
        onApprove={() => approveAgentApplication(item.id)}
        onReject={(reason) => rejectAgentApplication(item.id, reason)}
      />
    </RowShell>
  );
}
