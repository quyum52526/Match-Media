"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ClockIcon, ShieldCheckIcon } from "@/components/ui/icons";
import type { ContactGateStatus } from "@/types/contactGate";
import { gateCopy } from "./copy";

/**
 * Everything the UI shows when the contact gate blocks messaging or a call.
 *
 * Three surfaces, one copy table (see ./copy.ts):
 *
 *   <ContactGateNotice>  the inline banner that REPLACES a dead composer
 *   <ContactGateModal>   the same explanation on a click that can't proceed
 *   <ContactGateHint>    one line of helper text under a disabled trigger
 *
 * All three render `null` when contact is allowed, so a caller can mount them
 * unconditionally and never branch on `status.allowed` itself.
 */

/* ------------------------------------------------------------------ */
/* Banner                                                              */
/* ------------------------------------------------------------------ */

export function ContactGateNotice({
  status,
  className,
}: {
  status: ContactGateStatus;
  className?: string;
}) {
  const t = useTranslations("ContactGate");
  const copy = gateCopy(status);
  if (!copy) return null;

  const waiting = copy.tone === "waiting";

  return (
    <div
      // `role="status"` not "alert": being unverified is a state to read, not an
      // error to interrupt a screen reader with mid-typing.
      role="status"
      className={[
        "flex flex-col gap-3 rounded-card border p-4 text-left sm:flex-row sm:items-start sm:gap-4",
        waiting
          ? "border-amber-200 bg-amber-50"
          : "border-primary/20 bg-primary/5",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        aria-hidden
        className={
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full " +
          (waiting ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary")
        }
      >
        {waiting ? (
          <ClockIcon width={18} height={18} />
        ) : (
          <ShieldCheckIcon width={18} height={18} />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p
          className={
            "text-sm font-semibold " +
            (waiting ? "text-amber-900" : "text-ink")
          }
        >
          {t(`${copy.key}.title`)}
        </p>
        <p
          className={
            "mt-1 text-sm leading-6 " +
            (waiting ? "text-amber-800/80" : "text-ink/70")
          }
        >
          {t(`${copy.key}.body`)}
        </p>

        {copy.href && (
          <Link href={copy.href} className="mt-3 inline-block">
            <Button size="sm">{t(`${copy.key}.cta`)}</Button>
          </Link>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */

/**
 * The banner in a dialog, for triggers that stay clickable (profile Message /
 * Call). Clickable-then-explained beats disabled: a disabled button tells the
 * member nothing and is the drop-off we're fixing.
 */
export function ContactGateModal({
  open,
  onClose,
  status,
}: {
  open: boolean;
  onClose: () => void;
  status: ContactGateStatus;
}) {
  const t = useTranslations("ContactGate");
  const copy = gateCopy(status);
  if (!copy) return null;

  return (
    <Modal open={open} onClose={onClose} title={t("modalTitle")}>
      {/* Borderless inside the dialog — the dialog chrome already frames it. */}
      <ContactGateNotice status={status} className="!border-0 !bg-transparent !p-0" />
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Inline hint                                                         */
/* ------------------------------------------------------------------ */

/**
 * One line under a disabled control, with the destination as a link so the fix
 * is always one click away — including on touch, where a hover tooltip never
 * appears. Pair it with `title={useContactGateHintText()}` on the control
 * itself for the pointer tooltip.
 */
export function ContactGateHint({
  status,
  className,
  id,
}: {
  status: ContactGateStatus;
  className?: string;
  /** Set it when a control points here with `aria-describedby`. */
  id?: string;
}) {
  const t = useTranslations("ContactGate");
  const copy = gateCopy(status);
  if (!copy) return null;

  return (
    <p
      id={id}
      className={[
        "text-xs leading-5",
        copy.tone === "waiting" ? "text-amber-700" : "text-ink/55",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {t(`${copy.key}.hint`)}
      {copy.href && (
        <>
          {" "}
          <Link
            href={copy.href}
            className="font-medium text-primary underline underline-offset-2"
          >
            {t(`${copy.key}.cta`)}
          </Link>
        </>
      )}
    </p>
  );
}

/**
 * The hint as a plain string, for `title`/`aria-label` on a disabled control
 * (attributes can't hold JSX). Returns undefined when contact is allowed.
 */
export function useContactGateHintText(
  status: ContactGateStatus,
): string | undefined {
  const t = useTranslations("ContactGate");
  const copy = gateCopy(status);
  return copy ? t(`${copy.key}.hint`) : undefined;
}
