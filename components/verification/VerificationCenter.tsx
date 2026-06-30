"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitNid, submitSelfie } from "@/lib/actions/verification";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import {
  ShieldCheckIcon,
  CheckCircleIcon,
  ClockIcon,
  XIcon,
} from "@/components/ui/icons";

type VerStatus = "UNVERIFIED" | "PENDING" | "APPROVED" | "REJECTED";

// ---------------------------------------------------------------------------
// Status chip
// ---------------------------------------------------------------------------

function StatusChip({ status }: { status: VerStatus | boolean }) {
  if (status === true || status === "APPROVED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
        <CheckCircleIcon width={13} height={13} />
        Verified
      </span>
    );
  }
  if (status === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
        <ClockIcon width={13} height={13} />
        Pending Review
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-600">
        <XIcon width={13} height={13} />
        Rejected
      </span>
    );
  }
  return (
    <span className="rounded-full bg-ink/5 px-2.5 py-0.5 text-xs font-semibold text-muted">
      Not Submitted
    </span>
  );
}

// ---------------------------------------------------------------------------
// File picker helper
// ---------------------------------------------------------------------------

function FilePicker({
  id,
  label,
  name,
  accept,
}: {
  id: string;
  label: string;
  name: string;
  accept?: string;
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted">
        {label}
      </label>
      <label
        htmlFor={id}
        className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-hairline bg-canvas px-3 py-2 text-sm text-muted hover:border-primary/40 hover:text-ink"
      >
        <span className="truncate">{fileName ?? "Choose file…"}</span>
      </label>
      <input
        id={id}
        name={name}
        type="file"
        accept={accept ?? "image/*"}
        className="sr-only"
        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// NID card
// ---------------------------------------------------------------------------

function NidCard({
  status,
  reviewNote,
}: {
  status: VerStatus;
  reviewNote: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await submitNid(fd);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSuccess(true);
        formRef.current?.reset();
        router.refresh();
      }
    });
  }

  const canSubmit = status === "UNVERIFIED" || status === "REJECTED";

  return (
    <Card>
      <CardBody>
        <div className="mb-3 flex items-center justify-between gap-2">
          <CardTitle>National ID (NID)</CardTitle>
          <StatusChip status={status} />
        </div>

        <p className="mb-4 text-sm text-muted">
          Upload clear photos of both sides of your National Identity Card.
          The admin team will review within 1–2 business days.
        </p>

        {status === "REJECTED" && reviewNote && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <strong>Rejection reason:</strong> {reviewNote}
          </div>
        )}

        {canSubmit && (
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
            <FilePicker id="nidFront" name="nidFront" label="NID Front side *" />
            <FilePicker id="nidBack" name="nidBack" label="NID Back side *" />

            {error && <p className="text-xs text-red-600">{error}</p>}
            {success && (
              <p className="text-xs text-success">
                Submitted! Our team will review your documents soon.
              </p>
            )}

            <Button type="submit" size="sm" variant="primary" disabled={isPending} fullWidth>
              {isPending ? "Uploading…" : "Submit NID"}
            </Button>
          </form>
        )}

        {status === "APPROVED" && (
          <p className="text-sm text-success">
            Your National ID has been verified. ✓
          </p>
        )}
        {status === "PENDING" && (
          <p className="text-sm text-muted">
            Your documents are under review. We'll notify you once the admin has decided.
          </p>
        )}
      </CardBody>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Selfie card
// ---------------------------------------------------------------------------

function SelfieCard({
  status,
  reviewNote,
}: {
  status: VerStatus;
  reviewNote: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await submitSelfie(fd);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSuccess(true);
        formRef.current?.reset();
        router.refresh();
      }
    });
  }

  const canSubmit = status === "UNVERIFIED" || status === "REJECTED";

  return (
    <Card>
      <CardBody>
        <div className="mb-3 flex items-center justify-between gap-2">
          <CardTitle>Live Selfie</CardTitle>
          <StatusChip status={status} />
        </div>

        <p className="mb-4 text-sm text-muted">
          Upload a clear, recent photo of your face in good lighting. This
          confirms you are the person named in your NID.
        </p>

        {status === "REJECTED" && reviewNote && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <strong>Rejection reason:</strong> {reviewNote}
          </div>
        )}

        {canSubmit && (
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
            <FilePicker id="selfie" name="selfie" label="Selfie photo *" />

            {error && <p className="text-xs text-red-600">{error}</p>}
            {success && (
              <p className="text-xs text-success">
                Submitted! Our team will review your selfie soon.
              </p>
            )}

            <Button type="submit" size="sm" variant="primary" disabled={isPending} fullWidth>
              {isPending ? "Uploading…" : "Submit Selfie"}
            </Button>
          </form>
        )}

        {status === "APPROVED" && (
          <p className="text-sm text-success">Your selfie has been verified. ✓</p>
        )}
        {status === "PENDING" && (
          <p className="text-sm text-muted">
            Your selfie is under review. We'll notify you once approved.
          </p>
        )}
      </CardBody>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Trust progress bar
// ---------------------------------------------------------------------------

function TrustProgress({
  isMobileVerified,
  nidStatus,
  selfieStatus,
}: {
  isMobileVerified: boolean;
  nidStatus: VerStatus;
  selfieStatus: VerStatus;
}) {
  const signals = [
    { label: "Mobile OTP", done: isMobileVerified },
    { label: "NID Documents", done: nidStatus === "APPROVED" },
    { label: "Live Selfie", done: selfieStatus === "APPROVED" },
  ];
  const score = Math.round((signals.filter((s) => s.done).length / signals.length) * 100);

  return (
    <Card>
      <CardBody>
        <div className="mb-3 flex items-center justify-between gap-2">
          <CardTitle>Trust Score</CardTitle>
          <span className="text-lg font-bold text-success">{score}%</span>
        </div>
        <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-ink/8">
          <div
            className="h-full rounded-full bg-success transition-all duration-700"
            style={{ width: `${score}%` }}
          />
        </div>
        <ul className="space-y-2">
          {signals.map((s) => (
            <li key={s.label} className="flex items-center gap-2 text-sm">
              {s.done ? (
                <CheckCircleIcon width={16} height={16} className="text-success" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-ink/20" />
              )}
              <span className={s.done ? "text-ink" : "text-muted"}>{s.label}</span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

interface UserVerificationState {
  isMobileVerified: boolean;
  mobile: string | null;
  nidVerificationStatus: VerStatus;
  nidReviewNote: string | null;
  selfieVerificationStatus: VerStatus;
  selfieReviewNote: string | null;
  agencyVerificationStatus: string;
  accountCategory: string | null;
}

export function VerificationCenter({ user }: { user: UserVerificationState }) {
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <ShieldCheckIcon width={22} height={22} className="text-primary" />
          <h1 className="text-xl font-bold text-ink">Verification Center</h1>
        </div>
        <p className="text-sm text-muted">
          Complete these steps to earn your Verified badge and build trust with
          other members.
        </p>
      </div>

      <TrustProgress
        isMobileVerified={user.isMobileVerified}
        nidStatus={user.nidVerificationStatus}
        selfieStatus={user.selfieVerificationStatus}
      />

      <div className="space-y-4">
        {/* Mobile — handled by OTP during registration; shown as read-only */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle>Mobile Number</CardTitle>
                <p className="mt-1 text-sm text-muted">
                  {user.mobile ?? "Not added yet"}
                </p>
              </div>
              <StatusChip status={user.isMobileVerified} />
            </div>
            {!user.isMobileVerified && (
              <p className="mt-2 text-xs text-muted">
                Verify your mobile number during registration or from account settings.
              </p>
            )}
          </CardBody>
        </Card>

        <NidCard
          status={user.nidVerificationStatus}
          reviewNote={user.nidReviewNote}
        />

        <SelfieCard
          status={user.selfieVerificationStatus}
          reviewNote={user.selfieReviewNote}
        />
      </div>
    </div>
  );
}
