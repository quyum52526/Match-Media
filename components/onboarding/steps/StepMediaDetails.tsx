"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const DISTRICTS = [
  "Dhaka","Chattogram","Sylhet","Rajshahi","Khulna","Barishal","Mymensingh","Rangpur",
  "Gazipur","Narayanganj","Comilla","Cumilla","Jessore","Jashore","Cox's Bazar","Bogura",
  "Dinajpur","Tangail","Faridpur","Noakhali",
];

export function StepMediaDetails({ onNext, onBack }: Props) {
  const [agencyName, setAgencyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [district, setDistrict] = useState("");

  const isValid = agencyName.trim().length > 1 && contactPerson.trim().length > 1;

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (isValid) onNext(); }}
      className="space-y-5"
    >
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
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
          Agency Name <span className="text-primary">*</span>
        </label>
        <input
          type="text"
          value={agencyName}
          onChange={(e) => setAgencyName(e.target.value)}
          placeholder="e.g. Dhaka Matrimony Services"
          className="w-full rounded-card border border-hairline bg-white px-3 py-2.5 text-sm text-ink placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Contact Person */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
          Contact Person Name <span className="text-primary">*</span>
        </label>
        <input
          type="text"
          value={contactPerson}
          onChange={(e) => setContactPerson(e.target.value)}
          placeholder="Full name of the primary contact"
          className="w-full rounded-card border border-hairline bg-white px-3 py-2.5 text-sm text-ink placeholder:text-muted/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* District */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
          Agency District <span className="font-normal normal-case text-muted/60">(optional)</span>
        </label>
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className="w-full rounded-card border border-hairline bg-white px-3 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Select district…</option>
          {DISTRICTS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button type="submit" disabled={!isValid} className="flex-1">
          Continue
        </Button>
      </div>
    </form>
  );
}
