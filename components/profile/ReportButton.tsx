"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { reportProfile } from "@/lib/actions/reports";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FlagIcon, CheckIcon } from "@/components/ui/icons";
import type { ReportReason } from "./types";

const REASONS: ReportReason[] = [
  "INAPPROPRIATE_PHOTO",
  "FAKE_PROFILE",
  "HARASSMENT",
  "SPAM",
  "OTHER",
];

/** "Report" affordance on a profile — opens a modal (reason + optional note). */
export function ReportButton({ reportedUserId }: { reportedUserId: string }) {
  const t = useTranslations("Report");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("INAPPROPRIATE_PHOTO");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const res = await reportProfile(reportedUserId, reason, note);
      if (res.ok) {
        setDone(true);
        setOpen(false);
      }
    });
  }

  if (done) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
        <CheckIcon width={14} height={14} />
        {t("submitted")}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs font-medium text-ink/45 transition-colors hover:text-red-600"
      >
        <FlagIcon width={13} height={13} />
        {t("button")}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={t("title")}>
        <div className="space-y-4">
          <p className="text-sm text-ink/60">{t("intro")}</p>

          <div className="space-y-1">
            <label className="text-sm font-medium text-ink">
              {t("reasonLabel")}
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as ReportReason)}
              className="h-11 w-full rounded-xl border border-hairline bg-white px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {t(`reasons.${r}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-ink">
              {t("noteLabel")}
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("notePlaceholder")}
              className="w-full rounded-xl border border-hairline bg-white p-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button variant="primary" size="sm" onClick={submit} disabled={pending}>
              {t("submit")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
