"use client";

import { useActionState, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { updateProfile } from "@/lib/actions/profile";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { CheckIcon, LockIcon } from "@/components/ui/icons";
import {
  GENDERS,
  PROFESSIONS,
  EDUCATION_LEVELS,
  MARITAL_STATUSES,
  HEIGHTS,
} from "@/lib/constants/profileOptions";
import { DISTRICTS, upazilasFor } from "@/lib/constants/bdGeo";
import { localize } from "@/lib/constants/labels";
import type { EditableProfile } from "./types";

const inputClass =
  "h-11 w-full rounded-xl border border-hairline bg-white px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";
const areaClass =
  "w-full rounded-xl border border-hairline bg-white p-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";

type Valued = { value: string };

/** Include the current (possibly legacy/non-standard) value so it isn't lost. */
function withCurrent(options: readonly Valued[], current: string): Valued[] {
  return current && !options.some((o) => o.value === current)
    ? [{ value: current }, ...options]
    : [...options];
}

const HEIGHT_OPTIONS: Valued[] = HEIGHTS.map((h) => ({ value: h }));

export function ProfileEditForm({
  initial,
  clientId,
}: {
  initial: EditableProfile;
  /** When set, the form targets this client profile (MEDIA agency edit flow). */
  clientId?: string;
}) {
  const t = useTranslations("ProfileEdit");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(updateProfile, undefined);

  // District -> Upazila cascade is controlled so the upazila list stays in sync.
  const [district, setDistrict] = useState(initial.district);
  const [upazila, setUpazila] = useState(initial.upazila);

  return (
    <form action={formAction} className="space-y-6">
      {clientId && <input type="hidden" name="clientId" value={clientId} />}
      {/* Basic */}
      <Card>
        <CardBody className="space-y-4">
          <CardTitle>{t("sections.basic")}</CardTitle>
          <Field label={t("fields.fullName")}>
            <input
              name="fullName"
              type="text"
              defaultValue={initial.fullName}
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("fields.gender")}>
              {initial.gender ? (
                // Gender is immutable once set (enforced server-side too).
                <>
                  <div
                    className={`${inputClass} flex items-center justify-between bg-ink/5 text-ink/70`}
                    aria-readonly="true"
                  >
                    <span>{localize(initial.gender, locale)}</span>
                    <LockIcon
                      width={14}
                      height={14}
                      className="shrink-0 text-ink/40"
                    />
                  </div>
                  <p className="mt-1 text-xs text-ink/45">
                    {t("genderLocked")}
                  </p>
                </>
              ) : (
                <StdSelect
                  name="gender"
                  value={initial.gender}
                  options={GENDERS}
                  placeholder={t("gender.placeholder")}
                  locale={locale}
                  required
                />
              )}
            </Field>
            <Field label={t("fields.dateOfBirth")}>
              <input
                name="dateOfBirth"
                type="date"
                required
                defaultValue={initial.dateOfBirth}
                className={`${inputClass} font-body`}
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      {/* Location + background */}
      <Card>
        <CardBody className="space-y-4">
          <CardTitle>{t("sections.background")}</CardTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* District (cascades into Upazila) */}
            <Field label={t("fields.district")}>
              <select
                name="district"
                value={district}
                onChange={(e) => {
                  setDistrict(e.target.value);
                  setUpazila(""); // reset — upazilas differ per district
                }}
                className={inputClass}
              >
                <option value="">{t("select")}</option>
                {withCurrent(DISTRICTS, district).map((d) => (
                  <option key={d.value} value={d.value}>
                    {localize(d.value, locale)}
                  </option>
                ))}
              </select>
            </Field>

            {/* Upazila (depends on the selected district) */}
            <Field label={t("fields.upazila")}>
              <select
                name="upazila"
                value={upazila}
                disabled={!district}
                onChange={(e) => setUpazila(e.target.value)}
                className={`${inputClass} disabled:bg-ink/5 disabled:text-ink/40`}
              >
                <option value="">
                  {district ? t("select") : t("selectDistrictFirst")}
                </option>
                {withCurrent(upazilasFor(district), upazila).map((u) => (
                  <option key={u.value} value={u.value}>
                    {localize(u.value, locale)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t("fields.profession")}>
              <StdSelect
                name="profession"
                value={initial.profession}
                options={PROFESSIONS}
                placeholder={t("select")}
                locale={locale}
              />
            </Field>
            <Field label={t("fields.education")}>
              <StdSelect
                name="education"
                value={initial.education}
                options={EDUCATION_LEVELS}
                placeholder={t("select")}
                locale={locale}
              />
            </Field>
            <Field label={t("fields.maritalStatus")}>
              <StdSelect
                name="maritalStatus"
                value={initial.maritalStatus}
                options={MARITAL_STATUSES}
                placeholder={t("select")}
                locale={locale}
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      {/* Additional details */}
      <Card>
        <CardBody className="space-y-4">
          <CardTitle>{t("sections.details")}</CardTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label={t("fields.height")}>
              <StdSelect
                name="height"
                value={initial.height}
                options={HEIGHT_OPTIONS}
                placeholder={t("select")}
                locale={locale}
                latin
              />
            </Field>
            <Field label={t("fields.weight")}>
              <input
                name="weight"
                type="text"
                defaultValue={initial.weight}
                className={inputClass}
              />
            </Field>
            <Field label={t("fields.childrenStatus")}>
              <input
                name="childrenStatus"
                type="text"
                defaultValue={initial.childrenStatus}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label={t("fields.familyDetails")}>
            <textarea
              name="familyDetails"
              rows={2}
              defaultValue={initial.familyDetails}
              className={areaClass}
            />
          </Field>
        </CardBody>
      </Card>

      {/* About + privacy */}
      <Card>
        <CardBody className="space-y-4">
          <CardTitle>{t("sections.about")}</CardTitle>
          <Field label={t("fields.bio")}>
            <textarea
              name="bio"
              rows={4}
              defaultValue={initial.bio}
              className={areaClass}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              name="nameHidden"
              defaultChecked={initial.nameHidden}
              className="h-4 w-4 rounded border-ink/30 text-primary focus:ring-primary/30"
            />
            {t("fields.nameHidden")}
          </label>
        </CardBody>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {t("save")}
        </Button>
        {state === "OK" && (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
            <CheckIcon width={16} height={16} />
            {t("saved")}
          </span>
        )}
        {state && state !== "OK" && (
          <span className="text-sm font-medium text-red-600">
            {t(`errors.${state}`)}
          </span>
        )}
      </div>
    </form>
  );
}

/**
 * Uncontrolled standardized <select>: submits the canonical English `value`,
 * displays the locale-appropriate label, and keeps any legacy value.
 */
function StdSelect({
  name,
  value,
  options,
  placeholder,
  locale,
  required,
  latin,
}: {
  name: string;
  value: string;
  options: readonly Valued[];
  placeholder: string;
  locale: string;
  required?: boolean;
  latin?: boolean;
}) {
  return (
    <select
      name={name}
      defaultValue={value}
      required={required}
      className={`${inputClass}${latin ? " font-body" : ""}`}
    >
      <option value="" disabled={required}>
        {placeholder}
      </option>
      {withCurrent(options, value).map((o) => (
        <option key={o.value} value={o.value}>
          {latin ? o.value : localize(o.value, locale)}
        </option>
      ))}
    </select>
  );
}

function Field({
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
