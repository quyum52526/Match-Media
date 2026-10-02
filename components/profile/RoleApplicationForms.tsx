"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { applyForAgency, applyForAgent } from "@/lib/actions/roleApplications";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { LockIcon } from "@/components/ui/icons";
import { DISTRICTS } from "@/lib/constants/bdGeo";
import { localize } from "@/lib/constants/labels";

/**
 * The two role-application forms.
 *
 * Name and mobile are rendered LOCKED from the session and are not submitted:
 * the application belongs to the signed-in account, and the server reads both
 * from that account rather than from the form (see lib/actions/roleApplications.ts).
 * Showing them read-only tells the applicant which identity they are applying
 * with, without inviting them to type a different one.
 *
 * On success the page shows the under-review banner; the server has the
 * application in PENDING and an admin takes it from there.
 */

const inputClass =
  "h-11 w-full rounded-xl border border-hairline bg-white px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";
const areaClass =
  "w-full rounded-xl border border-hairline bg-white p-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";
const fileClass =
  "w-full rounded-xl border border-hairline bg-white p-2.5 text-sm text-ink file:mr-3 file:rounded-pill file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary";

export interface Applicant {
  fullName: string;
  mobile: string;
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-ink">
        {label}
        {required && <span className="ml-0.5 text-primary">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-ink/50">{hint}</p>}
    </div>
  );
}

/** Identity the application is filed under — from the session, not editable. */
function LockedIdentity({ applicant }: { applicant: Applicant }) {
  const t = useTranslations("ExpandAccount");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          { label: t("fields.fullName"), value: applicant.fullName },
          { label: t("fields.mobile"), value: applicant.mobile },
        ].map((row) => (
          <div key={row.label} className="space-y-1">
            <label className="text-sm font-medium text-ink">{row.label}</label>
            <div
              className={`${inputClass} flex items-center justify-between bg-ink/5 font-body text-ink/70`}
              aria-readonly="true"
            >
              <span className="truncate">{row.value || "—"}</span>
              <LockIcon width={14} height={14} className="shrink-0 text-ink/40" />
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-ink/50">{t("lockedNote")}</p>
    </div>
  );
}

function Feedback({
  error,
  submitted,
}: {
  error: string | null;
  submitted: boolean;
}) {
  const t = useTranslations("ExpandAccount");
  if (submitted) {
    return (
      <p className="rounded-card border border-amber-300/50 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
        {t("underReview")}
      </p>
    );
  }
  if (error) {
    return <p className="text-sm font-medium text-red-600">{error}</p>;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Marriage media                                                      */
/* ------------------------------------------------------------------ */

export function AgencyApplicationForm({ applicant }: { applicant: Applicant }) {
  const t = useTranslations("ExpandAccount");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await applyForAgency(formData);
      if (result.ok) setSubmitted(true);
      else setError(result.error);
    });
  }

  if (submitted) {
    return (
      <Card>
        <CardBody>
          <Feedback error={null} submitted />
        </CardBody>
      </Card>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <Card>
        <CardBody className="space-y-5">
          <div>
            <CardTitle>{t("agency.title")}</CardTitle>
            <p className="mt-1 text-sm text-muted">{t("agency.subtitle")}</p>
          </div>

          <LockedIdentity applicant={applicant} />

          <Field label={t("fields.agencyName")} required>
            <input name="agencyName" type="text" required className={inputClass} />
          </Field>

          <Field label={t("fields.tradeLicenseNumber")} required>
            <input
              name="tradeLicenseNumber"
              type="text"
              required
              className={`${inputClass} font-body`}
            />
          </Field>

          <Field
            label={t("fields.tradeLicenseDocument")}
            required
            hint={t("fields.documentHint")}
          >
            <input
              name="tradeLicenseDocument"
              type="file"
              required
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className={fileClass}
            />
          </Field>

          <Field label={t("fields.officeAddress")} required>
            <textarea name="officeAddress" rows={3} required className={areaClass} />
          </Field>

          <Feedback error={error} submitted={false} />

          <Button type="submit" disabled={pending}>
            {pending ? t("submitting") : t("submit")}
          </Button>
        </CardBody>
      </Card>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Verification agent                                                  */
/* ------------------------------------------------------------------ */

export function AgentApplicationForm({ applicant }: { applicant: Applicant }) {
  const t = useTranslations("ExpandAccount");
  const locale = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();
  // Controlled so the submit button can require at least one district before
  // the round trip; the server validates the list again regardless.
  const [districts, setDistricts] = useState<string[]>([]);

  function toggleDistrict(value: string) {
    setDistricts((current) =>
      current.includes(value)
        ? current.filter((d) => d !== value)
        : [...current, value],
    );
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await applyForAgent(formData);
      if (result.ok) setSubmitted(true);
      else setError(result.error);
    });
  }

  if (submitted) {
    return (
      <Card>
        <CardBody>
          <Feedback error={null} submitted />
        </CardBody>
      </Card>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <Card>
        <CardBody className="space-y-5">
          <div>
            <CardTitle>{t("agent.title")}</CardTitle>
            <p className="mt-1 text-sm text-muted">{t("agent.subtitle")}</p>
          </div>

          <LockedIdentity applicant={applicant} />

          <Field label={t("fields.nidNumber")} required hint={t("fields.nidHint")}>
            <input
              name="nidNumber"
              type="text"
              inputMode="numeric"
              required
              className={`${inputClass} font-body`}
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field
              label={t("fields.nidFront")}
              required
              hint={t("fields.documentHint")}
            >
              <input
                name="nidFront"
                type="file"
                required
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className={fileClass}
              />
            </Field>
            <Field
              label={t("fields.nidBack")}
              required
              hint={t("fields.documentHint")}
            >
              <input
                name="nidBack"
                type="file"
                required
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className={fileClass}
              />
            </Field>
          </div>

          <Field
            label={t("fields.policeVerification")}
            hint={t("fields.policeHint")}
          >
            <input
              name="policeVerification"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className={fileClass}
            />
          </Field>

          {/* Districts: a checkbox set, because an agent usually covers two or
              three and a multi-select is unusable on a phone. */}
          <Field
            label={t("fields.operatingDistricts")}
            required
            hint={t("fields.districtsHint", { count: String(districts.length) })}
          >
            <div className="max-h-56 overflow-y-auto rounded-xl border border-hairline bg-white p-2">
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                {DISTRICTS.map((d) => (
                  <label
                    key={d.value}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink hover:bg-ink/5"
                  >
                    <input
                      type="checkbox"
                      name="operatingDistricts"
                      value={d.value}
                      checked={districts.includes(d.value)}
                      onChange={() => toggleDistrict(d.value)}
                      className="h-4 w-4 rounded border-ink/30 text-primary focus:ring-primary/30"
                    />
                    {localize(d.value, locale)}
                  </label>
                ))}
              </div>
            </div>
          </Field>

          <Feedback error={error} submitted={false} />

          <Button type="submit" disabled={pending || districts.length === 0}>
            {pending ? t("submitting") : t("submit")}
          </Button>
        </CardBody>
      </Card>
    </form>
  );
}
