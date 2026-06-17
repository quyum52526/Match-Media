"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { updateProfile } from "@/lib/actions/profile";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { CheckIcon } from "@/components/ui/icons";
import {
  PROFESSIONS,
  EDUCATION_LEVELS,
  MARITAL_STATUSES,
  HEIGHTS,
} from "@/lib/constants/profileOptions";
import { DISTRICTS, upazilasFor } from "@/lib/constants/bdGeo";
import type { EditableProfile } from "./types";

const inputClass =
  "h-11 w-full rounded-xl border border-charcoal/15 bg-white px-3 text-sm text-charcoal outline-none focus:border-trustGreen focus:ring-2 focus:ring-trustGreen/30";
const areaClass =
  "w-full rounded-xl border border-charcoal/15 bg-white p-3 text-sm text-charcoal outline-none focus:border-trustGreen focus:ring-2 focus:ring-trustGreen/30";

/** Include the current (possibly legacy/non-standard) value so it isn't lost. */
function withCurrent(options: readonly string[], current: string): string[] {
  return current && !options.includes(current)
    ? [current, ...options]
    : [...options];
}

export function ProfileEditForm({ initial }: { initial: EditableProfile }) {
  const t = useTranslations("ProfileEdit");
  const [state, formAction, pending] = useActionState(updateProfile, undefined);

  // District -> Upazila cascade is controlled so the upazila list stays in sync.
  const [district, setDistrict] = useState(initial.district);
  const [upazila, setUpazila] = useState(initial.upazila);
  const upazilaOptions = withCurrent(upazilasFor(district), upazila);

  return (
    <form action={formAction} className="space-y-6">
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
              <select
                name="gender"
                required
                defaultValue={initial.gender}
                className={inputClass}
              >
                <option value="" disabled>
                  {t("gender.placeholder")}
                </option>
                <option value="পুরুষ">{t("gender.male")}</option>
                <option value="নারী">{t("gender.female")}</option>
              </select>
            </Field>
            <Field label={t("fields.dateOfBirth")}>
              <input
                name="dateOfBirth"
                type="date"
                required
                defaultValue={initial.dateOfBirth}
                className={`${inputClass} font-sans`}
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
                  <option key={d} value={d}>
                    {d}
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
                className={`${inputClass} disabled:bg-charcoal/5 disabled:text-charcoal/40`}
              >
                <option value="">
                  {district ? t("select") : t("selectDistrictFirst")}
                </option>
                {upazilaOptions.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t("fields.profession")}>
              <StandardSelect
                name="profession"
                value={initial.profession}
                options={PROFESSIONS}
                placeholder={t("select")}
              />
            </Field>
            <Field label={t("fields.education")}>
              <StandardSelect
                name="education"
                value={initial.education}
                options={EDUCATION_LEVELS}
                placeholder={t("select")}
              />
            </Field>
            <Field label={t("fields.maritalStatus")}>
              <StandardSelect
                name="maritalStatus"
                value={initial.maritalStatus}
                options={MARITAL_STATUSES}
                placeholder={t("select")}
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
              <StandardSelect
                name="height"
                value={initial.height}
                options={HEIGHTS}
                placeholder={t("select")}
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
          <label className="flex items-center gap-2 text-sm text-charcoal">
            <input
              type="checkbox"
              name="nameHidden"
              defaultChecked={initial.nameHidden}
              className="h-4 w-4 rounded border-charcoal/30 text-trustGreen focus:ring-trustGreen/30"
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
          <span className="inline-flex items-center gap-1 text-sm font-medium text-trustGreen">
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

/** An uncontrolled standardized <select> that keeps the user's current value. */
function StandardSelect({
  name,
  value,
  options,
  placeholder,
  latin,
}: {
  name: string;
  value: string;
  options: readonly string[];
  placeholder: string;
  latin?: boolean;
}) {
  return (
    <select
      name={name}
      defaultValue={value}
      className={`${inputClass}${latin ? " font-sans" : ""}`}
    >
      <option value="">{placeholder}</option>
      {withCurrent(options, value).map((o) => (
        <option key={o} value={o}>
          {o}
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
      <label className="text-sm font-medium text-charcoal">{label}</label>
      {children}
    </div>
  );
}
