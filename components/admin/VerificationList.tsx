"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { setVerified } from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ShieldCheckIcon, InboxIcon } from "@/components/ui/icons";
import { localize } from "@/lib/constants/labels";
import type { VerificationProfile } from "./types";

export function VerificationList({
  profiles,
}: {
  profiles: VerificationProfile[];
}) {
  const t = useTranslations("Admin.verification");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle(userId: string, value: boolean) {
    startTransition(async () => {
      const res = await setVerified(userId, value);
      if (res.ok) router.refresh();
    });
  }

  if (profiles.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-charcoal/15 bg-white py-12 text-center">
        <InboxIcon width={28} height={28} className="text-charcoal/30" />
        <p className="text-sm text-charcoal/50">{t("empty")}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {profiles.map((p) => (
        <li
          key={p.userId}
          className="flex items-center justify-between gap-3 rounded-2xl border border-charcoal/10 bg-white p-4"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-charcoal">
                {p.name}
              </span>
              {p.isVerified && (
                <Badge variant="verified" icon={<ShieldCheckIcon width={13} height={13} />}>
                  {t("verified")}
                </Badge>
              )}
            </div>
            <p className="truncate font-sans text-xs text-charcoal/50">{p.email}</p>
            <p className="mt-0.5 text-xs text-charcoal/40">
              <span className="font-sans">{p.age}</span>
              {p.district ? ` · ${localize(p.district, locale)}` : ""} ·{" "}
              <Link
                href={`/profiles/${p.userId}`}
                className="font-medium text-trustGreen hover:underline"
              >
                {t("viewProfile")}
              </Link>
            </p>
          </div>

          {p.isVerified ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => toggle(p.userId, false)}
              disabled={pending}
            >
              {t("revoke")}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="primary"
              onClick={() => toggle(p.userId, true)}
              disabled={pending}
            >
              <ShieldCheckIcon width={16} height={16} />
              {t("grant")}
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
