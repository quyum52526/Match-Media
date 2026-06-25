"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { approvePhoto, rejectPhoto } from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";
import { CheckIcon, XIcon, InboxIcon } from "@/components/ui/icons";
import { formatDate } from "@/lib/utils";
import type { PendingPhoto } from "./types";

export function PhotoModerationQueue({ photos }: { photos: PendingPhoto[] }) {
  const t = useTranslations("Admin.photos");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Which card is in "enter rejection reason" mode.
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  function act(fn: () => Promise<{ ok: boolean }>) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setRejectingId(null);
        setReason("");
        router.refresh();
      }
    });
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-hairline bg-white py-12 text-center">
        <InboxIcon width={28} height={28} className="text-ink/30" />
        <p className="text-sm text-ink/50">{t("empty")}</p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {photos.map((photo) => (
        <li
          key={photo.id}
          className="overflow-hidden rounded-2xl border border-ink/10 bg-white"
        >
          <div className="aspect-[3/4] w-full bg-ink/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="space-y-3 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                {photo.ownerName}
              </p>
              <p className="truncate font-body text-xs text-ink/50">
                {photo.ownerEmail}
              </p>
              <p className="mt-0.5 text-xs text-ink/40">
                {t("uploadedOn", { date: formatDate(photo.uploadedAt) })}
              </p>
            </div>

            {rejectingId === photo.id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("rejectReasonPlaceholder")}
                  className="h-10 w-full rounded-lg border border-hairline px-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => act(() => rejectPhoto(photo.id, reason))}
                    disabled={pending}
                  >
                    {t("confirmReject")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setRejectingId(null)}
                    disabled={pending}
                  >
                    {t("cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => act(() => approvePhoto(photo.id))}
                  disabled={pending}
                >
                  <CheckIcon width={16} height={16} />
                  {t("approve")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setReason("");
                    setRejectingId(photo.id);
                  }}
                  disabled={pending}
                >
                  <XIcon width={16} height={16} />
                  {t("reject")}
                </Button>
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
