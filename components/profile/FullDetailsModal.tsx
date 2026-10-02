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
  BookOpen,
  Landmark,
  Home,
  Wallet,
  GraduationCap,
  School,
  UsersRound,
  Network,
  Utensils,
  Cigarette,
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

  // Religion, sect and the lifestyle fields. Religion/sect/diet/smoking are
  // canonical enum values so they localize; caste is free text and passes
  // through verbatim. Empty values are dropped by Section, and the whole
  // section disappears when a member has filled none of them.
  const beliefs: DetailItem[] = [
    {
      icon: BookOpen,
      label: t("religion"),
      value: localize(details.religion, locale),
    },
    { icon: Landmark, label: t("sect"), value: localize(details.sect, locale) },
    { icon: Users, label: t("caste"), value: details.caste },
    { icon: Utensils, label: t("diet"), value: localize(details.diet, locale) },
    {
      icon: Cigarette,
      label: t("smoking"),
      value: localize(details.smokingStatus, locale),
    },
  ];

  // Education & career: the institute/subject pair reads as one block with the
  // profession already shown on the key-facts card.
  const career: DetailItem[] = [
    {
      icon: School,
      label: t("educationInstitute"),
      value: details.educationInstitute,
    },
    {
      icon: GraduationCap,
      label: t("educationMajor"),
      value: details.educationMajor,
    },
  ];

  // Parent status ("Alive" / "Deceased") and the family class/type are
  // canonical values, so they localize; the professions and sibling blurbs are
  // free text and pass through. A parent's status is appended to the
  // profession so each parent reads as one row instead of two.
  const familyRows: DetailItem[] = [
    {
      icon: Briefcase,
      label: t("fatherProfession"),
      value: withStatus(family.fatherProfession, localize(family.fatherStatus ?? "", locale)),
    },
    {
      icon: UserRound,
      label: t("motherProfession"),
      value: withStatus(family.motherProfession, localize(family.motherStatus ?? "", locale)),
    },
    {
      icon: Users,
      label: t("brothers"),
      value: withStatus(family.brothers, family.brothersDetails),
    },
    {
      icon: Users,
      label: t("sisters"),
      value: withStatus(family.sisters, family.sistersDetails),
    },
    // Legacy rows that only ever had the free-text blurb.
    { icon: Users, label: t("numberOfSiblings"), value: family.siblings },
    { icon: HeartHandshake, label: t("familyValues"), value: family.values },
  ];

  // Household environment: how the family lives and where it sits socially.
  const environment: DetailItem[] = [
    {
      icon: Home,
      label: t("familyType"),
      value: localize(family.familyType ?? "", locale) || family.status,
    },
    {
      icon: Wallet,
      label: t("familyClass"),
      value: localize(family.familyClass ?? "", locale),
    },
  ];

  // Relatives — chacha/fufu and mama/khala, a standard part of how a match is
  // evaluated here, so they get their own section rather than a note.
  const relatives: DetailItem[] = [
    {
      icon: Network,
      label: t("paternalBackground"),
      value: family.paternalBackground,
    },
    {
      icon: UsersRound,
      label: t("maternalBackground"),
      value: family.maternalBackground,
    },
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

      <div className="relative z-10 mx-auto flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-card bg-white shadow-card">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 p-4 sm:px-6">
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
            className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Body — scrolls on its own when the content overflows. */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-6">
            <Section title={t("personalSection")} items={personal} />
            <Section title={t("careerSection")} items={career} />
            <Section title={t("beliefsSection")} items={beliefs} />
            <Section title={t("familySection")} items={familyRows} />
            <Section title={t("environmentSection")} items={environment} />
            <Section
              title={t("relativesSection")}
              items={relatives}
              note={family.note}
              noteLabel={t("familyNote")}
            />
            {![personal, career, beliefs, familyRows, environment, relatives].some(
              (section) => section.some(hasValue),
            ) &&
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

/**
 * Join a value with its qualifier — "Business (Alive)", "2 (1 elder, married)".
 * Either side may be missing: with no qualifier the value stands alone, and a
 * qualifier with no value is shown on its own rather than as empty parentheses.
 */
function withStatus(value?: string, qualifier?: string): string | undefined {
  const main = value?.trim();
  const extra = qualifier?.trim();
  if (!main) return extra || undefined;
  return extra ? `${main} (${extra})` : main;
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
