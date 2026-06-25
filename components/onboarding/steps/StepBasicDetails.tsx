"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

const GENDERS = ["Male", "Female"];
const LOOKING_FOR = ["Bride", "Groom"];
const MARITAL_STATUSES = ["Never Married", "Divorced", "Widowed"];

interface Props {
  onNext: () => void;
}

export function StepBasicDetails({ onNext }: Props) {
  const [gender, setGender] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [profession, setProfession] = useState("");
  const [district, setDistrict] = useState("");

  const isValid = gender && lookingFor && maritalStatus;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (isValid) onNext();
      }}
      className="space-y-5"
    >
      {/* Gender */}
      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          I am a
        </legend>
        <div className="flex gap-3">
          {GENDERS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGender(g)}
              className={`flex-1 rounded-card border py-2.5 text-sm font-medium transition-all ${
                gender === g
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-hairline text-ink hover:border-primary/40"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Looking for */}
      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Looking for a
        </legend>
        <div className="flex gap-3">
          {LOOKING_FOR.map((l) => (
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

      {/* Marital status */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
          Marital Status
        </label>
        <select
          value={maritalStatus}
          onChange={(e) => setMaritalStatus(e.target.value)}
          className="w-full rounded-card border border-hairline bg-white px-3 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Select…</option>
          {MARITAL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Profession */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
          Profession <span className="font-normal normal-case text-muted/60">(optional)</span>
        </label>
        <input
          type="text"
          value={profession}
          onChange={(e) => setProfession(e.target.value)}
          placeholder="e.g. Software Engineer"
          className="w-full rounded-card border border-hairline bg-white px-3 py-2.5 text-sm text-ink placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* District */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
          District <span className="font-normal normal-case text-muted/60">(optional)</span>
        </label>
        <input
          type="text"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          placeholder="e.g. Dhaka"
          className="w-full rounded-card border border-hairline bg-white px-3 py-2.5 text-sm text-ink placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <Button type="submit" fullWidth disabled={!isValid} className="mt-2">
        Continue
      </Button>
    </form>
  );
}
