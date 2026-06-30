"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { saveMediaDetailsAction } from "@/lib/actions/onboarding";
import { DISTRICTS } from "@/lib/constants/bdGeo";

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const INPUT =
  "w-full rounded-card border border-hairline bg-white px-3 py-2.5 text-sm text-ink placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

const LABEL =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted";

export function StepMediaDetails({ onNext, onBack }: Props) {
  const [agencyName, setAgencyName]       = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [district, setDistrict]           = useState("");
  const [error, setError]                 = useState("");
  const [isPending, startTransition]      = useTransition();

  const isValid = agencyName.trim().length > 1 && contactPerson.trim().length > 1;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setError("");
    startTransition(async () => {
      const result = await saveMediaDetailsAction({
        agencyName,
        contactPerson,
        agencyDistrict: district || undefined,
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        onNext();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Context note */}
      <div className="flex items-start gap-2.5 rounded-card bg-accent/10 px-4 py-3">
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
        </svg>
        <p className="text-xs leading-relaxed text-ink/70">
          As a <span className="font-semibold text-ink">Media Agency</span>, you will manage client profiles under this account. This information helps us verify your agency.
        </p>
      </div>

      {/* Agency Name */}
      <div>
        <label className={LABEL}>
          Agency Name <span className="text-primary">*</span>
        </label>
        <input
          type="text"
          value={agencyName}
          onChange={(e) => setAgencyName(e.target.value)}
          placeholder="e.g. Dhaka Matrimony Services"
          className={INPUT}
        />
      </div>

      {/* Contact Person */}
      <div>
        <label className={LABEL}>
          Contact Person Name <span className="text-primary">*</span>
        </label>
        <input
          type="text"
          value={contactPerson}
          onChange={(e) => setContactPerson(e.target.value)}
          placeholder="Full name of the primary contact"
          className={INPUT}
        />
      </div>

      {/* District — all 64 districts */}
      <div>
        <label className={LABEL}>
          Agency District{" "}
          <span className="font-normal normal-case text-muted/60">(optional)</span>
        </label>
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className={INPUT}
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

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1" disabled={isPending}>
          Back
        </Button>
        <Button type="submit" disabled={!isValid || isPending} className="flex-1">
          {isPending ? "Saving…" : "Continue"}
        </Button>
      </div>
    </form>
  );
}
