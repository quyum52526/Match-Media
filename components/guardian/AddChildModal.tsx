"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { createGuardianChildProfile } from "@/lib/actions/guardianClients";
import {
  GENDERS,
  PROFESSIONS,
  EDUCATION_LEVELS,
} from "@/lib/constants/profileOptions";
import { DISTRICTS } from "@/lib/constants/bdGeo";

interface Props {
  open: boolean;
  onClose: () => void;
}

const INPUT =
  "h-11 w-full rounded-card border border-hairline bg-white px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

const LABEL =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted";

export function AddChildModal({ open, onClose }: Props) {
  const t = useTranslations("GuardianDashboard.addModal");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [district, setDistrict] = useState("");
  const [profession, setProfession] = useState("");
  const [education, setEducation] = useState("");

  function reset() {
    setFullName(""); setGender(""); setDateOfBirth("");
    setDistrict(""); setProfession(""); setEducation("");
    setError(""); setSuccess(false);
  }

  function handleClose() { reset(); onClose(); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await createGuardianChildProfile({
        fullName, gender, dateOfBirth,
        district: district || undefined,
        profession: profession || undefined,
        education: education || undefined,
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(handleClose, 1200);
      }
    });
  }

  const canSubmit = fullName.trim() && gender && dateOfBirth && !isPending;

  return (
    <Modal open={open} onClose={handleClose} title={t("title")}>
      <p className="mb-5 text-sm text-muted">{t("subtitle")}</p>

      {success ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success text-2xl">✓</span>
          <p className="font-semibold text-ink">{t("success")}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={LABEL}>{t("fullName")} <span className="text-primary">*</span></label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
              placeholder={t("fullNamePlaceholder")} className={INPUT} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>{t("gender")} <span className="text-primary">*</span></label>
              <select value={gender} onChange={(e) => setGender(e.target.value)} className={INPUT} required>
                <option value="">—</option>
                {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.value}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>{t("dateOfBirth")} <span className="text-primary">*</span></label>
              <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)}
                max={new Date(Date.now() - 18 * 365.25 * 86400000).toISOString().slice(0, 10)}
                className={INPUT} required />
            </div>
          </div>

          <div>
            <label className={LABEL}>{t("district")}</label>
            <select value={district} onChange={(e) => setDistrict(e.target.value)} className={INPUT}>
              <option value="">{t("districtPlaceholder")}</option>
              {DISTRICTS.map((d) => <option key={d.value} value={d.value}>{d.value}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>{t("profession")}</label>
              <select value={profession} onChange={(e) => setProfession(e.target.value)} className={INPUT}>
                <option value="">{t("professionPlaceholder")}</option>
                {PROFESSIONS.map((p) => <option key={p.value} value={p.value}>{p.value}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>{t("education")}</label>
              <select value={education} onChange={(e) => setEducation(e.target.value)} className={INPUT}>
                <option value="">{t("educationPlaceholder")}</option>
                {EDUCATION_LEVELS.map((e) => <option key={e.value} value={e.value}>{e.value}</option>)}
              </select>
            </div>
          </div>

          {error && (
            <p className="rounded-card border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={!canSubmit} className="flex-1">
              {isPending ? t("saving") : t("save")}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>{t("cancel")}</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
