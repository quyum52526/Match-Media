"use client";

import { useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  LockIcon,
  ShieldCheckIcon,
  CheckIcon,
  XIcon,
  HeartIcon,
  InboxIcon,
} from "@/components/ui/icons";
import { formatDate } from "@/lib/utils";
import { localize } from "@/lib/constants/labels";
import { respondToInterest } from "@/lib/actions/funnel";
import type {
  ReceivedInterest,
  InterestInboxStatus,
} from "./types";
import type { RequestPerson } from "@/components/requests/types";

export function InterestInbox({ interests }: { interests: ReceivedInterest[] }) {
  const t = useTranslations("Interests");
  const [isPending, startTransition] = useTransition();

  function respond(id: string, decision: "ACCEPTED" | "DECLINED") {
    startTransition(async () => {
      await respondToInterest(id, decision);
    });
  }

  if (interests.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-charcoal/15 bg-white py-12 text-center">
        <InboxIcon width={28} height={28} className="text-charcoal/30" />
        <p className="text-sm text-charcoal/50">{t("empty")}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {interests.map((i) => (
        <li
          key={i.id}
          className="flex flex-col gap-3 rounded-2xl border border-charcoal/10 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <PersonInfo person={i.person} createdAt={i.createdAt} />

          <div className="shrink-0 sm:pl-4">
            {i.status === "SENT" ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => respond(i.id, "ACCEPTED")}
                  disabled={isPending}
                >
                  <CheckIcon width={16} height={16} />
                  {t("actions.accept")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => respond(i.id, "DECLINED")}
                  disabled={isPending}
                >
                  <XIcon width={16} height={16} />
                  {t("actions.decline")}
                </Button>
              </div>
            ) : (
              <StatusBadge status={i.status} />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function PersonInfo({
  person,
  createdAt,
}: {
  person: RequestPerson;
  createdAt: string;
}) {
  const t = useTranslations("Interests");
  const locale = useLocale();
  return (
    <div className="flex items-center gap-3">
      {/* Blurred mini thumbnail (privacy-first) */}
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-charcoal/5">
        <div
          className="h-full w-full scale-110 bg-gradient-to-br from-trustGreen/30 via-verifyGreen/20 to-gold/20 blur-md"
          aria-hidden
        />
        <span className="absolute inset-0 flex items-center justify-center text-charcoal/70">
          <LockIcon width={16} height={16} />
        </span>
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-charcoal">
            {person.displayName}
          </span>
          {person.nameHidden && (
            <LockIcon width={12} height={12} className="shrink-0 text-charcoal/40" />
          )}
          {person.isVerified && (
            <ShieldCheckIcon
              width={14}
              height={14}
              className="shrink-0 text-verifyGreen"
            />
          )}
        </div>
        <p className="text-xs text-charcoal/60">
          <span className="font-sans font-medium text-charcoal/80">
            {person.age}
          </span>{" "}
          · {localize(person.upazila, locale)}, {localize(person.district, locale)}
        </p>
        <p className="mt-0.5 text-xs text-charcoal/40">
          {t("meta.receivedOn", { date: formatDate(createdAt) })}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: InterestInboxStatus }) {
  const t = useTranslations("Interests.status");

  if (status === "ACCEPTED") {
    return (
      <Badge variant="verified" icon={<HeartIcon width={14} height={14} />}>
        {t("accepted")}
      </Badge>
    );
  }
  return (
    <Badge variant="neutral" icon={<XIcon width={14} height={14} />}>
      {t("declined")}
    </Badge>
  );
}
