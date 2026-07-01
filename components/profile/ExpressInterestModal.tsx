"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { HeartIcon } from "@/components/ui/icons";

/** Pre-filled starter note — users can edit or clear it before sending. */
const DEFAULT_NOTE =
  "Hi! I really liked your profile and would love to connect to get to know you better.";

interface ExpressInterestModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (note: string) => void;
  pending?: boolean;
}

export function ExpressInterestModal({
  open,
  onClose,
  onConfirm,
  pending,
}: ExpressInterestModalProps) {
  const t = useTranslations("Profile.interest");
  const [note, setNote] = useState(DEFAULT_NOTE);

  // Re-seed the default note (and its character count) each time the modal opens.
  useEffect(() => {
    if (open) setNote(DEFAULT_NOTE);
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title={t("modalTitle")}>
      <p className="text-sm text-ink/60">{t("modalBody")}</p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value.slice(0, 200))}
        maxLength={200}
        rows={3}
        placeholder={t("notePlaceholder")}
        className="mt-3 w-full rounded-xl border border-hairline bg-white px-3 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
      />
      <p className="mt-1 text-right text-xs text-ink/40">{note.length}/200</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>
          {t("cancel")}
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => onConfirm(note)}
          disabled={pending}
        >
          <HeartIcon width={16} height={16} />
          {t("send")}
        </Button>
      </div>
    </Modal>
  );
}
