"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LockIcon, ShieldCheckIcon, InboxIcon } from "@/components/ui/icons";
import { formatDate } from "@/lib/utils";
import { localize } from "@/lib/constants/labels";
import type { ConversationSummary } from "./types";

export function ConversationList({
  conversations,
}: {
  conversations: ConversationSummary[];
}) {
  const t = useTranslations("Messages");
  const locale = useLocale();

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-hairline bg-white py-12 text-center">
        <InboxIcon width={28} height={28} className="text-ink/30" />
        <p className="text-sm text-ink/50">{t("empty")}</p>
        <p className="text-xs text-ink/40">{t("emptyHint")}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {conversations.map((c) => (
        <li key={c.id}>
          <Link
            href={`/messages/${c.id}`}
            className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-white p-4 transition-shadow hover:shadow-md"
          >
            {/* Blurred mini thumbnail (privacy-first, like the other inboxes) */}
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-ink/5">
              <div
                className="h-full w-full scale-110 bg-gradient-to-br from-primary/30 via-success/20 to-accent/20 blur-md"
                aria-hidden
              />
              <span className="absolute inset-0 flex items-center justify-center text-ink/70">
                <LockIcon width={15} height={15} />
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold text-ink">
                  {c.person.displayName}
                </span>
                {c.person.isVerified && (
                  <ShieldCheckIcon
                    width={14}
                    height={14}
                    className="shrink-0 text-success"
                  />
                )}
                <span className="ml-auto shrink-0 text-xs text-ink/40">
                  {formatDate(c.lastMessageAt)}
                </span>
              </div>
              <p className="mt-0.5 flex items-center gap-2">
                <span
                  className={
                    "truncate text-xs " +
                    (c.unread > 0
                      ? "font-medium text-ink"
                      : "text-ink/55")
                  }
                >
                  {c.lastFromMe ? `${t("youPrefix")} ` : ""}
                  {c.lastPreview || t("noMessagesYet")}
                </span>
                {c.unread > 0 && (
                  <span className="ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 font-body text-xs font-semibold text-white">
                    {c.unread}
                  </span>
                )}
              </p>
              <p className="sr-only">
                {localize(c.person.district, locale)}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
