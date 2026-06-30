"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { updateAgencyDetails } from "@/lib/actions/mediaAgency";
import { DISTRICTS } from "@/lib/constants/bdGeo";

export interface AgencyData {
  agencyName: string;
  contactPerson: string;
  agencyDistrict: string;
}

interface Props {
  initial: AgencyData;
}

const INPUT =
  "h-11 w-full rounded-card border border-hairline bg-white px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";

const LABEL = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted";

export function AgencyEditForm({ initial }: Props) {
  const [agencyName, setAgencyName]     = useState(initial.agencyName);
  const [contactPerson, setContactPerson] = useState(initial.contactPerson);
  const [district, setDistrict]         = useState(initial.agencyDistrict);
  const [saved, setSaved]               = useState(false);
  const [error, setError]               = useState("");
  const [isPending, startTransition]    = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await updateAgencyDetails({
        agencyName,
        contactPerson,
        agencyDistrict: district || undefined,
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          required
        />
      </div>

      <div>
        <label className={LABEL}>
          Contact Person <span className="text-primary">*</span>
        </label>
        <input
          type="text"
          value={contactPerson}
          onChange={(e) => setContactPerson(e.target.value)}
          placeholder="Full name of primary contact"
          className={INPUT}
          required
        />
      </div>

      <div>
        <label className={LABEL}>District</label>
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

      <div className="flex items-center gap-3 pt-1">
        <Button
          type="submit"
          disabled={isPending || !agencyName.trim() || !contactPerson.trim()}
        >
          {isPending ? "Saving…" : "Save Changes"}
        </Button>
        {saved && (
          <span className="text-sm font-medium text-success">Saved!</span>
        )}
      </div>
    </form>
  );
}
