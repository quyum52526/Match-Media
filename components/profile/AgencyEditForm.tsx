"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";

const DISTRICTS = [
  "Dhaka","Chattogram","Sylhet","Rajshahi","Khulna","Barishal","Mymensingh","Rangpur",
  "Gazipur","Narayanganj","Comilla","Jessore","Cox's Bazar","Bogura","Dinajpur",
  "Tangail","Faridpur","Noakhali",
];

export interface AgencyData {
  agencyName: string;
  contactPerson: string;
  agencyDistrict: string;
}

interface Props {
  initial: AgencyData;
}

export function AgencyEditForm({ initial }: Props) {
  const [agencyName, setAgencyName] = useState(initial.agencyName);
  const [contactPerson, setContactPerson] = useState(initial.contactPerson);
  const [district, setDistrict] = useState(initial.agencyDistrict);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const inputClass =
    "h-11 w-full rounded-card border border-hairline bg-white px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      // TODO: wire to a server action (updateAgencyDetails)
      await new Promise((r) => setTimeout(r, 600));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardBody className="space-y-4">
          <CardTitle>Agency Information</CardTitle>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
              Agency Name <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              placeholder="e.g. Dhaka Matrimony Services"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
              Contact Person <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="Full name of primary contact"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
              District
            </label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className={inputClass}
            >
              <option value="">Select district…</option>
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </CardBody>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending || !agencyName || !contactPerson}>
          {isPending ? "Saving…" : "Save Changes"}
        </Button>
        {saved && (
          <span className="text-sm font-medium text-success">Saved!</span>
        )}
      </div>
    </form>
  );
}
