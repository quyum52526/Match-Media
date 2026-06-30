"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { saveBasicDetailsAction } from "@/lib/actions/onboarding";
import { PROFESSIONS, MARITAL_STATUSES } from "@/lib/constants/profileOptions";
import { DISTRICTS } from "@/lib/constants/bdGeo";
import type { AccountCategory } from "./StepCategorySelect";

// DB-level values — never change these regardless of UI label.
const GENDER_VALUES = { male: "Male", female: "Female" } as const;
const LOOKING_FOR_VALUES = { bride: "Bride", groom: "Groom" } as const;

interface GenderOption {
  value: string;
  label: string;
}

/** Returns the two gender options and fieldset legend for the given category. */
function genderConfig(category: AccountCategory): {
  legend: string;
  options: [GenderOption, GenderOption];
} {
  if (category === "PARENTS") {
    return {
      legend: "Creating profile for",
      options: [
        { value: GENDER_VALUES.male,   label: "Son"      },
        { value: GENDER_VALUES.female, label: "Daughter" },
      ],
    };
  }
  return {
    legend: "I am a",
    options: [
      { value: GENDER_VALUES.male,   label: "Male"   },
      { value: GENDER_VALUES.female, label: "Female" },
    ],
  };
}

/**
 * For PARENTS: automatically derive the expected match from the child's gender.
 * Son (Male) → looking for a Bride; Daughter (Female) → looking for a Groom.
 */
function derivedLookingFor(gender: string): string {
  if (gender === GENDER_VALUES.male)   return LOOKING_FOR_VALUES.bride;
  if (gender === GENDER_VALUES.female) return LOOKING_FOR_VALUES.groom;
  return "";
}

const SELECT =
  "w-full rounded-card border border-hairline bg-white px-3 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

const LABEL =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted";

interface Props {
  category: AccountCategory;
  onNext: () => void;
}

export function StepBasicDetails({ category, onNext }: Props) {
  const [gender, setGender]               = useState("");
  const [lookingFor, setLookingFor]       = useState("");
  const [dateOfBirth, setDateOfBirth]     = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [profession, setProfession]       = useState("");
  const [district, setDistrict]           = useState("");
  const [error, setError]                 = useState("");
  const [isPending, startTransition]      = useTransition();

  const isParents = category === "PARENTS";
  const { legend, options } = genderConfig(category);

  // For PARENTS, auto-derive lookingFor whenever gender changes.
  useEffect(() => {
    if (isParents && gender) {
      setLookingFor(derivedLookingFor(gender));
    }
  }, [isParents, gender]);

  const isValid = gender && lookingFor && dateOfBirth && maritalStatus;

  function handleGenderSelect(value: string) {
    setGender(value);
    if (!isParents) setLookingFor("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setError("");
    startTransition(async () => {
      const result = await saveBasicDetailsAction({
        gender,
        dateOfBirth,
        maritalStatus,
        profession: profession || undefined,
        district: district || undefined,
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        onNext();
      }
    });
  }

  // Max DOB: must be at least 18 years old
  const maxDob = new Date(Date.now() - 18 * 365.25 * 86400000)
    .toISOString()
    .slice(0, 10);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Gender / Profile-for selection */}
      <fieldset>
        <legend className={LABEL}>{legend}</legend>
        <div className="flex gap-3">
          {options.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleGenderSelect(value)}
              className={`flex-1 rounded-card border py-2.5 text-sm font-medium transition-all ${
                gender === value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-hairline text-ink hover:border-primary/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Looking for — interactive for SELF, auto-confirmed for PARENTS */}
      {isParents ? (
        gender ? (
          <div className="flex items-center gap-2 rounded-card border border-hairline bg-canvas px-3.5 py-2.5">
            <svg className="h-4 w-4 shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-ink/70">
              Looking for a{" "}
              <span className="font-semibold text-ink">{lookingFor}</span>
              <span className="ml-1.5 text-xs text-muted">(auto-set)</span>
            </p>
          </div>
        ) : null
      ) : (
        <fieldset>
          <legend className={LABEL}>Looking for a</legend>
          <div className="flex gap-3">
            {(["Bride", "Groom"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLookingFor(l)}
                className={`flex-1 rounded-card border py-2.5 text-sm font-medium transition-all ${
                  lookingFor === l
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-hairline text-ink hover:border-primary/40"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {/* Date of birth */}
      <div>
        <label className={LABEL}>
          {isParents ? "Their Date of Birth" : "Date of Birth"}{" "}
          <span className="text-primary">*</span>
        </label>
        <input
          type="date"
          value={dateOfBirth}
          max={maxDob}
          onChange={(e) => setDateOfBirth(e.target.value)}
          className={`${SELECT} font-body`}
          required
        />
      </div>

      {/* Marital status */}
      <div>
        <label className={LABEL}>
          {isParents ? "Their Marital Status" : "Marital Status"}{" "}
          <span className="text-primary">*</span>
        </label>
        <select
          value={maritalStatus}
          onChange={(e) => setMaritalStatus(e.target.value)}
          className={SELECT}
          required
        >
          <option value="">Select…</option>
          {MARITAL_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.value}
            </option>
          ))}
        </select>
      </div>

      {/* Profession — dropdown */}
      <div>
        <label className={LABEL}>
          {isParents ? "Their Profession" : "Profession"}{" "}
          <span className="font-normal normal-case text-muted/60">(optional)</span>
        </label>
        <select
          value={profession}
          onChange={(e) => setProfession(e.target.value)}
          className={SELECT}
        >
          <option value="">Select profession…</option>
          {PROFESSIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.value}
            </option>
          ))}
        </select>
      </div>

      {/* District — dropdown */}
      <div>
        <label className={LABEL}>
          District{" "}
          <span className="font-normal normal-case text-muted/60">(optional)</span>
        </label>
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className={SELECT}
        >
          <option value="">Select district…</option>
          {DISTRICTS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.value}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="rounded-card border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <Button type="submit" fullWidth disabled={!isValid || isPending} className="mt-2">
        {isPending ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}
