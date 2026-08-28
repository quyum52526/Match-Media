"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { HeartIcon } from "@/components/ui/icons";

interface AuthGateModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Shown in place of a restricted action (connect, message, unlock a photo,
 * shortlist…) when the visitor is a guest or otherwise signed out. Never
 * calls the underlying mutation — it's a pure "sign in to continue" prompt.
 */
export function AuthGateModal({ open, onClose }: AuthGateModalProps) {
  const t = useTranslations("GuestGate");

  return (
    <Modal open={open} onClose={onClose} title={t("title")}>
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <HeartIcon width={22} height={22} />
        </span>
        <p className="text-sm text-ink/70">{t("body")}</p>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <Link href="/register" className="flex-1" onClick={onClose}>
            <Button variant="primary" fullWidth>
              {t("signup")}
            </Button>
          </Link>
          <Link href="/login" className="flex-1" onClick={onClose}>
            <Button variant="outline" fullWidth>
              {t("login")}
            </Button>
          </Link>
        </div>
      </div>
    </Modal>
  );
}
