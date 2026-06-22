"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { resolveReport } from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CheckIcon, XIcon, InboxIcon, FlagIcon } from "@/components/ui/icons";
import { formatDate } from "@/lib/utils";
import type { AdminReport } from "./types";

export function ReportsQueue({ reports }: { reports: AdminReport[] }) {
  const t = useTranslations("Admin.reports");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function act(id: string, decision: "RESOLVED" | "DISMISSED") {
    startTransition(async () => {
      const res = await resolveReport(id, decision);
      if (res.ok) router.refresh();
    });
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-charcoal/15 bg-white py-12 text-center">
        <InboxIcon width={28} height={28} className="text-charcoal/30" />
        <p className="text-sm text-charcoal/50">{t("empty")}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {reports.map((r) => (
        <li
          key={r.id}
          className="flex flex-col gap-3 rounded-2xl border border-charcoal/10 bg-white p-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="flex min-w-0 gap-3">
            {r.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={r.imageUrl}
                alt=""
                className="h-16 w-16 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-charcoal/5 text-charcoal/40">
                <FlagIcon width={20} height={20} />
              </span>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="neutral">{t(`reasons.${r.reason}`)}</Badge>
              </div>
              <p className="mt-1 truncate text-sm font-semibold text-charcoal">
                {r.reportedName}{" "}
                <span className="font-sans font-normal text-charcoal/50">
                  ({r.reportedEmail})
                </span>
              </p>
              {r.note && (
                <p className="mt-0.5 text-sm text-charcoal/70">“{r.note}”</p>
              )}
              <p className="mt-0.5 text-xs text-charcoal/40">
                {t("meta", {
                  reporter: r.reporterEmail,
                  date: formatDate(r.createdAt),
                })}
              </p>
              <Link
                href={`/profiles/${r.reportedUserId}`}
                className="mt-1 inline-block text-xs font-medium text-trustGreen hover:underline"
              >
                {t("viewProfile")}
              </Link>
            </div>
          </div>

          <div className="flex shrink-0 gap-2 sm:pl-4">
            <Button
              size="sm"
              variant="primary"
              onClick={() => act(r.id, "RESOLVED")}
              disabled={pending}
            >
              <CheckIcon width={16} height={16} />
              {t("resolve")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => act(r.id, "DISMISSED")}
              disabled={pending}
            >
              <XIcon width={16} height={16} />
              {t("dismiss")}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
