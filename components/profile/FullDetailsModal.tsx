"use client";

import { useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  X,
  Ruler,
  Scale,
  Baby,
  Heart,
  Users,
  Briefcase,
  UserRound,
  HeartHandshake,
  type LucideIcon,
} from "lucide-react";
import { localize } from "@/lib/constants/labels";
import type { ProfileFullDetails } from "./types";

/** Brand garnet used for the section icons and rules inside the modal. */
const ACCENT = "#7f1a4b";

export interface FullDetailsModalProps {
  open: boolean;
  onClose: () => void;
  /** Height / weight / children / marital status + parsed family background. */
  details: ProfileFullDetails;
  /** Shown under the modal title so the reader knows whose details these are. */
  displayName?: string;
}

/** One label/value pair. Rows with an empty value are dropped before render. */
interface DetailItem {
  icon: LucideIcon;
  label: string;
  value?: string | null;
}

/**
 * "Full Details" dialog for the profile page.
 *
 * Wider than the shared `Modal` primitive (max-w-2xl) so the long Bengali
 * family strings breathe, and split into two labelled sections instead of one
 * flat list. Values are printed bare — the label is the row's own heading, so
 * nothing repeats "Family details:" inside its own value.
 *
 * Empty fields are omitted rather than rendered blank; a section with no
 * values at all disappears entirely.
 */
export function FullDetailsModal({
  open,
  onClose,
  details,
  displayName,
}: FullDetailsModalProps) {
  const t = useTranslations("Profile.details");
  const locale = useLocale();

  // Escape to close + body scroll lock, matching components/ui/Modal.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const { family } = details;

  // Marital status is a canonical enum value, so it goes through localize()
  // exactly like the key-facts card. The rest are free text and pass through.
  const personal: DetailItem[] = [
    { icon: Ruler, label: t("height"), value: details.height },
    { icon: Scale, label: t("weight"), value: details.weight },
    { icon: Baby, label: t("children"), value: details.childrenStatus },
    {
      icon: Heart,
      label: t("maritalStatus"),
      value: localize(details.maritalStatus, locale),
    },
  ];

  const familyRows: DetailItem[] = [
    { icon: Users, label: t("familyStatus"), value: family.status },
    { icon: Briefcase, label: t("fatherOccupation"), value: family.fatherOccupation },
    { icon: UserRound, label: t("motherOccupation"), value: family.motherOccupation },
    { icon: Users, label: t("siblings"), value: family.siblings },
    { icon: HeartHandshake, label: t("familyValues"), value: family.values },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("title")}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-card bg-white shadow-card">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-ink sm:text-lg">
              {t("title")}
            </h2>
            {displayName && (
              <p className="mt-0.5 truncate text-xs text-gray-500">{displayName}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="-mr-1 shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Body — scrolls on its own when the content overflows. */}
        <div className="max-h-[80vh] overflow-y-auto p-4 sm:p-6">
          <div className="space-y-6">
            <Section title={t("personalSection")} items={personal} />
            <Section
              title={t("familySection")}
              items={familyRows}
              note={family.note}
              noteLabel={t("familyNote")}
            />
            {!personal.some(hasValue) &&
              !familyRows.some(hasValue) &&
              !family.note && (
                <p className="py-6 text-center text-sm text-gray-500">
                  {t("empty")}
                </p>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                       */
/* ------------------------------------------------------------------ */

function hasValue(item: DetailItem): boolean {
  return Boolean(item.value && item.value.trim());
}

function Section({
  title,
  items,
  note,
  noteLabel,
}: {
  title: string;
  items: DetailItem[];
  note?: string;
  noteLabel?: string;
}) {
  const rows = items.filter(hasValue);
  if (!rows.length && !note) return null;

  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink">
        <span
          aria-hidden
          className="inline-block h-4 w-1 rounded-full"
          style={{ backgroundColor: ACCENT }}
        />
        {title}
      </h3>

      <dl className="space-y-2">
        {rows.map((row) => (
          <Row key={row.label} item={row} />
        ))}

        {note && (
          <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {noteLabel}
            </dt>
            <dd className="mt-1 text-sm leading-6 text-ink">{note}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}

function Row({ item }: { item: DetailItem }) {
  const Icon = item.icon;
  return (
    <div className="grid grid-cols-1 gap-1 rounded-lg border border-gray-100 bg-gray-50/60 p-3 sm:grid-cols-3 sm:items-baseline sm:gap-4">
      <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500">
        <Icon size={15} strokeWidth={1.75} style={{ color: ACCENT }} aria-hidden />
        {item.label}
      </dt>
      <dd className="text-sm leading-6 text-ink sm:col-span-2">{item.value}</dd>
    </div>
  );
}
