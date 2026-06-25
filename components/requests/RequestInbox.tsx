"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { respondToPhotoRequest } from "@/lib/actions/funnel";
import { localize } from "@/lib/constants/labels";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  LockIcon,
  ShieldCheckIcon,
  CheckIcon,
  ClockIcon,
  XIcon,
  InboxIcon,
} from "@/components/ui/icons";
import { cn, formatDate } from "@/lib/utils";
import type {
  ReceivedRequest,
  SentRequest,
  RequestPerson,
  RequestStatus,
} from "./types";

interface RequestInboxProps {
  received: ReceivedRequest[];
  sent: SentRequest[];
}

type Tab = "received" | "sent";

export function RequestInbox({ received, sent }: RequestInboxProps) {
  const t = useTranslations("Requests");
  const [tab, setTab] = useState<Tab>("received");
  const [isPending, startTransition] = useTransition();

  // Approve/Deny mutate the DB; revalidatePath refreshes `received` from props.
  function respond(id: string, decision: "APPROVED" | "DENIED") {
    startTransition(async () => {
      await respondToPhotoRequest(id, decision);
    });
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "received", label: t("tabs.received"), count: received.length },
    { key: "sent", label: t("tabs.sent"), count: sent.length },
  ];

  return (
    <div>
      {/* Tabs */}
      <div
        role="tablist"
        className="mb-5 inline-flex rounded-xl border border-ink/10 bg-white p-1"
      >
        {tabs.map(({ key, label, count }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-white"
                  : "text-ink/60 hover:text-ink",
              )}
            >
              {label}
              <span
                className={cn(
                  "font-body rounded-full px-1.5 text-xs",
                  active ? "bg-white/20 text-white" : "bg-ink/10 text-ink/60",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Panels */}
      {tab === "received" ? (
        <RequestList
          empty={t("empty.received")}
          items={received.map((r) => (
            <RequestRow key={r.id} person={r.person} requestedAt={r.requestedAt}>
              {r.status === "PENDING" ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => respond(r.id, "APPROVED")}
                    disabled={isPending}
                  >
                    <CheckIcon width={16} height={16} />
                    {t("actions.approve")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => respond(r.id, "DENIED")}
                    disabled={isPending}
                  >
                    <XIcon width={16} height={16} />
                    {t("actions.deny")}
                  </Button>
                </div>
              ) : (
                <StatusBadge status={r.status} />
              )}
            </RequestRow>
          ))}
        />
      ) : (
        <RequestList
          empty={t("empty.sent")}
          items={sent.map((r) => (
            <RequestRow key={r.id} person={r.person} requestedAt={r.requestedAt}>
              <StatusBadge status={r.status} />
            </RequestRow>
          ))}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function RequestList({
  items,
  empty,
}: {
  items: React.ReactNode[];
  empty: string;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-hairline bg-white py-12 text-center">
        <InboxIcon width={28} height={28} className="text-ink/30" />
        <p className="text-sm text-ink/50">{empty}</p>
      </div>
    );
  }
  return <ul className="space-y-3">{items}</ul>;
}

function RequestRow({
  person,
  requestedAt,
  children,
}: {
  person: RequestPerson;
  requestedAt: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("Requests");
  const locale = useLocale();

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-ink/10 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        {/* Blurred mini thumbnail (privacy-first) */}
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink/5">
          <div
            className="h-full w-full scale-110 bg-gradient-to-br from-primary/30 via-success/20 to-accent/20 blur-md"
            aria-hidden
          />
          <span className="absolute inset-0 flex items-center justify-center text-ink/70">
            <LockIcon width={16} height={16} />
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-ink">
              {person.displayName}
            </span>
            {person.nameHidden && (
              <LockIcon width={12} height={12} className="shrink-0 text-ink/40" />
            )}
            {person.isVerified && (
              <ShieldCheckIcon width={14} height={14} className="shrink-0 text-success" />
            )}
          </div>
          <p className="text-xs text-ink/60">
            <span className="font-body font-medium text-ink/80">
              {person.age}
            </span>{" "}
            · {localize(person.upazila, locale)}, {localize(person.district, locale)}
          </p>
          <p className="mt-0.5 text-xs text-ink/40">
            {t("meta.requestedOn", { date: formatDate(requestedAt) })}
          </p>
        </div>
      </div>

      <div className="shrink-0 sm:pl-4">{children}</div>
    </li>
  );
}

function StatusBadge({ status }: { status: RequestStatus }) {
  const t = useTranslations("Requests.status");

  if (status === "APPROVED") {
    return (
      <Badge variant="verified" icon={<CheckIcon width={14} height={14} />}>
        {t("approved")}
      </Badge>
    );
  }
  if (status === "DENIED") {
    return (
      <Badge variant="neutral" icon={<XIcon width={14} height={14} />}>
        {t("denied")}
      </Badge>
    );
  }
  return (
    <Badge variant="gold" icon={<ClockIcon width={14} height={14} />}>
      {t("pending")}
    </Badge>
  );
}
