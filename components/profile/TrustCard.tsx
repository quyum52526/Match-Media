import {
  Phone,
  Mail,
  Camera,
  CreditCard,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import type { ProfileVerifications } from "./types";

interface TrustCardProps {
  verifications: ProfileVerifications;
}

const ITEMS: {
  key: keyof ProfileVerifications;
  label: string;
  sublabel: string;
  Icon: React.ElementType;
}[] = [
  {
    key: "mobile",
    label: "Mobile Number",
    sublabel: "Phone verified via OTP",
    Icon: Phone,
  },
  {
    key: "email",
    label: "Email Address",
    sublabel: "Email link confirmed",
    Icon: Mail,
  },
  {
    key: "photo",
    label: "Photo / Selfie",
    sublabel: "Identity photo approved",
    Icon: Camera,
  },
  {
    key: "nid",
    label: "Government ID",
    sublabel: "NID or Passport checked",
    Icon: CreditCard,
  },
];

export function TrustCard({ verifications }: TrustCardProps) {
  const verifiedCount = Object.values(verifications).filter(Boolean).length;
  const total = ITEMS.length;

  return (
    <Card>
      <CardBody>
        <div className="mb-4 flex items-center justify-between">
          <CardTitle className="!mb-0">Trust &amp; Verifications</CardTitle>
          <span className="rounded-pill bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
            {verifiedCount}/{total} verified
          </span>
        </div>

        <ul className="space-y-3">
          {ITEMS.map(({ key, label, sublabel, Icon }) => {
            const verified = verifications[key];
            return (
              <li key={key} className="flex items-center gap-3">
                {/* Icon bubble */}
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                    verified
                      ? "bg-success/10 text-success"
                      : "bg-ink/6 text-ink/30"
                  }`}
                >
                  <Icon size={16} strokeWidth={1.8} />
                </span>

                {/* Label */}
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium leading-tight ${
                      verified ? "text-ink" : "text-ink/40"
                    }`}
                  >
                    {label}
                  </p>
                  <p className="text-xs text-ink/40">{sublabel}</p>
                </div>

                {/* Status mark */}
                {verified ? (
                  <CheckCircle2
                    size={18}
                    className="shrink-0 text-success"
                    strokeWidth={2}
                  />
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium text-ink/30">
                    <Circle size={16} strokeWidth={1.5} />
                    Pending
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        {/* Progress bar */}
        <div className="mt-5 space-y-1.5">
          <div className="flex justify-between text-xs text-ink/50">
            <span>Trust score</span>
            <span className="font-medium text-success">
              {Math.round((verifiedCount / total) * 100)}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/8">
            <div
              className="h-full rounded-full bg-success transition-all duration-700"
              style={{ width: `${(verifiedCount / total) * 100}%` }}
            />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
