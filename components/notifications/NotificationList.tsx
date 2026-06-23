"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { markNotificationsRead } from "@/lib/actions/notifications";
import {
  BellIcon,
  ChatIcon,
  CheckIcon,
  EyeIcon,
  FlagIcon,
  HeartIcon,
  PhoneOffIcon,
  ShieldCheckIcon,
  XIcon,
} from "@/components/ui/icons";
import { formatDate } from "@/lib/utils";
import type { NotificationView } from "@/lib/data/notifications";
import type { NotificationType } from "@prisma/client";

const ICONS: Record<NotificationType, typeof BellIcon> = {
  PHOTO_REQUEST: EyeIcon,
  PHOTO_ACCESS_GRANTED: EyeIcon,
  INTEREST_RECEIVED: HeartIcon,
  INTEREST_ACCEPTED: HeartIcon,
  NEW_MESSAGE: ChatIcon,
  MISSED_CALL: PhoneOffIcon,
  PHOTO_APPROVED: CheckIcon,
  PHOTO_REJECTED: XIcon,
  VERIFIED_BADGE: ShieldCheckIcon,
  REPORT_RESOLVED: FlagIcon,
};

function Row({
  n,
  label,
}: {
  n: NotificationView;
  label: string;
}) {
  const Icon = ICONS[n.type] ?? BellIcon;
  const inner = (
    <div
      className={
        "flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors " +
        (n.read
          ? "border-ink/10 bg-white"
          : "border-primary/30 bg-primary/[0.05]")
      }
    >
      <span
        className={
          "mt-0.5 shrink-0 " + (n.read ? "text-ink/40" : "text-primary")
        }
      >
        <Icon width={20} height={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink">{label}</p>
        <p className="mt-0.5 font-body text-xs text-ink/50">
          {formatDate(n.createdAt)}
        </p>
      </div>
      {!n.read && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
      )}
    </div>
  );

  return n.link ? (
    <Link href={n.link} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export function NotificationList({ items }: { items: NotificationView[] }) {
  const t = useTranslations("Notifications");
  const router = useRouter();

  // Mark everything read on open, then refresh so the header bell clears.
  useEffect(() => {
    const hasUnread = items.some((n) => !n.read);
    if (!hasUnread) return;
    markNotificationsRead().then(() => router.refresh());
  }, [items, router]);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-ink/10 bg-white px-4 py-16 text-center text-sm text-ink/50">
        {t("empty")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((n) => (
        <Row key={n.id} n={n} label={t(`types.${n.type}`)} />
      ))}
    </div>
  );
}
