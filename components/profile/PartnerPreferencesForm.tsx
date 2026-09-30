"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { savePartnerPreferences } from "@/lib/actions/preferences";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { CheckIcon } from "@/components/ui/icons";
import {
  PROFESSIONS,
  EDUCATION_LEVELS,
  MARITAL_STATUSES,
  RELIGIONS,
  ALL_SECTS,
  HEIGHTS,
} from "@/lib/constants/profileOptions";
import { DISTRICTS } from "@/lib/constants/bdGeo";
import { localize } from "@/lib/constants/labels";
import type { EditablePartnerPreference } from "./types";

const inputClass =
  "h-11 w-full rounded-xl border border-hairline bg-white px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";

type ListField = Extract<
  keyof EditablePartnerPreference,
  "religions" | "sects" | "districts" | "professions" | "educations" | "maritalStatuses"
>;

/**
 * Partner-preference settings. Every dimension is optional: an empty selection
 * means "no preference" and widens the results rather than excluding everyone —
 * the same semantics the matcher uses (see lib/matching/score.ts).
 *
 * These only affect recommendation RANKING. They never change what the viewer is
 * allowed to see, so no privacy or access gate is involved here.
 */
export function PartnerPreferencesForm({
  initial,
}: {
  initial: EditablePartnerPreference;
}) {
  const t = useTranslations("Preferences");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState<EditablePartnerPreference>(initial);
  const [status, setStatus] = useState<"idle" | "saved" | string>("idle");

  function setField<K extends keyof EditablePartnerPreference>(
    key: K,
    next: EditablePartnerPreference[K],
  ) {
    setStatus("idle");
    setValue((prev) => ({ ...prev, [key]: next }));
  }

  function toggle(key: ListField, option: string) {
    const current = value[key];
    setField(
      key,
      current.includes(option)
        ? current.filter((v) => v !== option)
        : [...current, option],
    );
  }

  function submit() {
    startTransition(async () => {
      const result = await savePartnerPreferences({
        // "" -> null so an emptied input clears the bound rather than sending NaN.
        minAge: value.minAge ? Number(value.minAge) : null,
        maxAge: value.maxAge ? Number(value.maxAge) : null,
        minHeight: value.minHeight || null,
        maxHeight: value.maxHeight || null,
        religions: value.religions,
        sects: value.sects,
        districts: value.districts,
        professions: value.professions,
        educations: value.educations,
        maritalStatuses: value.maritalStatuses,
      });
      setStatus(result.ok ? "saved" : result.error);
    });
  }

  return (
    <Card>
      <CardBody className="space-y-6">
        <div>
          <CardTitle>{t("title")}</CardTitle>
          <p className="mt-1 text-sm text-ink/60">{t("intro")}</p>
        </div>

        {/* Age range */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Labelled label={t("fields.ageRange")}>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={18}
                max={100}
                aria-label={t("fields.minAge")}
                placeholder={t("fields.minAge")}
                value={value.minAge}
                onChange={(e) => setField("minAge", e.target.value)}
                className={`${inputClass} font-body`}
              />
              <span className="text-ink/40">–</span>
              <input
                type="number"
                inputMode="numeric"
                min={18}
                max={100}
                aria-label={t("fields.maxAge")}
                placeholder={t("fields.maxAge")}
                value={value.maxAge}
                onChange={(e) => setField("maxAge", e.target.value)}
                className={`${inputClass} font-body`}
              />
            </div>
          </Labelled>

          {/* Height range — canonical labels, identical in both locales. */}
          <Labelled label={t("fields.heightRange")}>
            <div className="flex items-center gap-2">
              <select
                aria-label={t("fields.minHeight")}
                value={value.minHeight}
                onChange={(e) => setField("minHeight", e.target.value)}
                className={`${inputClass} font-body`}
              >
                <option value="">{t("fields.minHeight")}</option>
                {HEIGHTS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <span className="text-ink/40">–</span>
              <select
                aria-label={t("fields.maxHeight")}
                value={value.maxHeight}
                onChange={(e) => setField("maxHeight", e.target.value)}
                className={`${inputClass} font-body`}
              >
                <option value="">{t("fields.maxHeight")}</option>
                {HEIGHTS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </Labelled>
        </div>

        <ChipGroup
          label={t("fields.religions")}
          hint={t("religionHint")}
          options={RELIGIONS}
          selected={value.religions}
          onToggle={(v) => toggle("religions", v)}
          locale={locale}
        />
        <ChipGroup
          label={t("fields.sects")}
          options={ALL_SECTS}
          selected={value.sects}
          onToggle={(v) => toggle("sects", v)}
          locale={locale}
        />
        <ChipGroup
          label={t("fields.educations")}
          options={EDUCATION_LEVELS}
          selected={value.educations}
          onToggle={(v) => toggle("educations", v)}
          locale={locale}
        />
        <ChipGroup
          label={t("fields.professions")}
          options={PROFESSIONS}
          selected={value.professions}
          onToggle={(v) => toggle("professions", v)}
          locale={locale}
        />
        <ChipGroup
          label={t("fields.maritalStatuses")}
          options={MARITAL_STATUSES}
          selected={value.maritalStatuses}
          onToggle={(v) => toggle("maritalStatuses", v)}
          locale={locale}
        />
        <ChipGroup
          label={t("fields.districts")}
          options={DISTRICTS}
          selected={value.districts}
          onToggle={(v) => toggle("districts", v)}
          locale={locale}
          scroll
        />

        <div className="flex items-center gap-3">
          <Button type="button" onClick={submit} disabled={pending}>
            {t("save")}
          </Button>
          {status === "saved" && (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              <CheckIcon width={16} height={16} />
              {t("saved")}
            </span>
          )}
          {status !== "idle" && status !== "saved" && (
            <span className="text-sm font-medium text-red-600">
              {t(`errors.${status}`)}
            </span>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

/**
 * Multi-select as a toggle-chip group: every option is a real checkbox, so the
 * control stays keyboard- and screen-reader-accessible while reading as chips.
 */
function ChipGroup({
  label,
  hint,
  options,
  selected,
  onToggle,
  locale,
  scroll,
}: {
  label: string;
  hint?: string;
  options: readonly { value: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  locale: string;
  /** Cap the height for long lists (e.g. all 64 districts). */
  scroll?: boolean;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-ink">{label}</legend>
      {hint && <p className="text-xs text-ink/50">{hint}</p>}
      <div
        className={
          scroll
            ? "max-h-44 overflow-y-auto rounded-xl border border-hairline p-2"
            : undefined
        }
      >
        <div className="flex flex-wrap gap-2">
          {options.map((o) => {
            const active = selected.includes(o.value);
            return (
              <label
                key={o.value}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-hairline text-ink/70 hover:border-primary/40"
                }`}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => onToggle(o.value)}
                  className="sr-only"
                />
                {localize(o.value, locale)}
              </label>
            );
          })}
        </div>
      </div>
    </fieldset>
  );
}

function Labelled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-ink">{label}</label>
      {children}
    </div>
  );
}
