"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updateProfile } from "@/lib/actions/profile";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { CheckIcon } from "@/components/ui/icons";
import type { EditableProfile } from "./types";

const inputClass =
  "h-11 w-full rounded-xl border border-charcoal/15 bg-white px-3 text-sm text-charcoal outline-none focus:border-trustGreen focus:ring-2 focus:ring-trustGreen/30";
const areaClass =
  "w-full rounded-xl border border-charcoal/15 bg-white p-3 text-sm text-charcoal outline-none focus:border-trustGreen focus:ring-2 focus:ring-trustGreen/30";

export function ProfileEditForm({ initial }: { initial: EditableProfile }) {
  const t = useTranslations("ProfileEdit");
  const [state, formAction, pending] = useActionState(updateProfile, undefined);

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
            <Field label={t("fields.district")}>
              <input
                name="district"
                type="text"
                defaultValue={initial.district}
                className={inputClass}
              />
            </Field>
            <Field label={t("fields.upazila")}>
              <input
                name="upazila"
                type="text"
                defaultValue={initial.upazila}
                className={inputClass}
              />
            </Field>
            <Field label={t("fields.profession")}>
              <input
                name="profession"
                type="text"
                defaultValue={initial.profession}
                className={inputClass}
              />
            </Field>
            <Field label={t("fields.education")}>
              <input
                name="education"
                type="text"
                defaultValue={initial.education}
                className={inputClass}
              />
            </Field>
            <Field label={t("fields.maritalStatus")}>
              <select
                name="maritalStatus"
                defaultValue={initial.maritalStatus}
                className={inputClass}
              >
                <option value="">{t("marital.placeholder")}</option>
                <option value="অবিবাহিত">{t("marital.single")}</option>
                <option value="বিবাহিত">{t("marital.married")}</option>
                <option value="তালাকপ্রাপ্ত">{t("marital.divorced")}</option>
                <option value="বিধবা/বিপত্নীক">{t("marital.widowed")}</option>
              </select>
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
              <input
                name="height"
                type="text"
                defaultValue={initial.height}
                className={inputClass}
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
