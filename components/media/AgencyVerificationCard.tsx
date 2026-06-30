"use client";

import { useRef, useState, useTransition } from "react";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { uploadAgencyLogo, submitTradeLicense } from "@/lib/actions/mediaAgency";
import type { AgencyVerificationStatus } from "@/lib/data/mediaDashboard";

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  AgencyVerificationStatus,
  { label: string; classes: string; icon: React.ReactNode }
> = {
  UNVERIFIED: {
    label: "Unverified",
    classes: "bg-ink/5 text-ink/60 border-hairline",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
  },
  PENDING_APPROVAL: {
    label: "Pending Admin Approval",
    classes: "bg-amber-50 text-amber-700 border-amber-200",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  VERIFIED: {
    label: "Verified Agency",
    classes: "bg-success/10 text-success border-success/20",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  REJECTED: {
    label: "Submission Rejected",
    classes: "bg-red-50 text-red-700 border-red-200",
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    ),
  },
};

function StatusBadge({ status }: { status: AgencyVerificationStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${cfg.classes}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Logo upload section (used inside the card header of MediaDashboard)
// ---------------------------------------------------------------------------

interface LogoUploadProps {
  initialLogoUrl: string | null;
  agencyName: string;
  onLogoChange: (previewUrl: string) => void;
}

export function AgencyLogoUpload({ initialLogoUrl, agencyName, onLogoChange }: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialLogoUrl);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const initials = agencyName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side preview immediately
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    onLogoChange(url);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      try {
        const result = await uploadAgencyLogo(formData);
        if ("error" in result) {
          setError(result.error);
          setPreviewUrl(initialLogoUrl);
          onLogoChange(initialLogoUrl ?? "");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
        setPreviewUrl(initialLogoUrl);
        onLogoChange(initialLogoUrl ?? "");
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-hairline bg-canvas transition hover:border-primary/60"
        title="Upload agency logo"
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Agency logo"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-xl font-bold text-ink/30">{initials || "?"}</span>
        )}
        {/* Hover overlay */}
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
          {isPending ? (
            <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          )}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFileChange}
      />
      <p className="text-[11px] text-muted">Click to upload logo</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Verification card
// ---------------------------------------------------------------------------

interface Props {
  initialStatus: AgencyVerificationStatus;
  hasTradeLicense: boolean;
  isMobileVerified: boolean;
}

export function AgencyVerificationCard({
  initialStatus,
  hasTradeLicense,
  isMobileVerified,
}: Props) {
  const licenseInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState(initialStatus);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [hasExistingLicense, setHasExistingLicense] = useState(hasTradeLicense);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const canSubmit = status !== "VERIFIED" && status !== "PENDING_APPROVAL";

  function handleLicenseFile(e: React.ChangeEvent<HTMLInputElement>) {
    setLicenseFile(e.target.files?.[0] ?? null);
    setError("");
  }

  function handleSubmit() {
    if (!licenseFile) return;
    setError("");
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", licenseFile);
        const result = await submitTradeLicense(formData);
        if ("error" in result) {
          setError(result.error);
        } else {
          setStatus("PENDING_APPROVAL");
          setHasExistingLicense(true);
          setLicenseFile(null);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Submission failed. Please try again.");
      }
    });
  }

  return (
    <Card>
      <CardBody className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <CardTitle>Agency Verification</CardTitle>
          <StatusBadge status={status} />
        </div>

        {/* Status description */}
        {status === "VERIFIED" && (
          <div className="flex items-start gap-2.5 rounded-card bg-success/8 px-4 py-3">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-ink/80">
              Your agency is <span className="font-semibold text-success">verified</span>. A Verified badge is now visible on all client profiles managed by your account.
            </p>
          </div>
        )}

        {status === "PENDING_APPROVAL" && (
          <div className="flex items-start gap-2.5 rounded-card bg-amber-50 px-4 py-3">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-amber-700">
              Your trade license is <span className="font-semibold">under admin review</span>. We'll notify you once it's approved, typically within 24–48 hours.
            </p>
          </div>
        )}

        {status === "REJECTED" && (
          <div className="flex items-start gap-2.5 rounded-card bg-red-50 px-4 py-3">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-sm text-red-700">
              Your previous submission was <span className="font-semibold">rejected</span>. Please upload a clearer copy of your trade license and re-submit.
            </p>
          </div>
        )}

        {status === "UNVERIFIED" && (
          <p className="text-sm text-muted">
            Upload your trade license to get your agency verified. Verified agencies receive a trust badge on all managed profiles.
          </p>
        )}

        {/* Trade license upload — shown when not yet verified or when rejected */}
        {canSubmit && (
          <div className="space-y-3 border-t border-hairline pt-4">
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted">
              Trade License Document
            </label>

            {hasExistingLicense && !licenseFile && (
              <div className="flex items-center gap-2 text-sm text-ink/70">
                <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Trade license on file.</span>
                <button
                  type="button"
                  onClick={() => licenseInputRef.current?.click()}
                  className="text-xs text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  Replace
                </button>
              </div>
            )}

            {(!hasExistingLicense || licenseFile) && (
              <div
                onClick={() => licenseInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center gap-2 rounded-card border-2 border-dashed border-hairline bg-canvas py-6 text-center transition hover:border-primary/40 hover:bg-primary/[0.02]"
              >
                <svg className="h-8 w-8 text-ink/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                {licenseFile ? (
                  <p className="text-sm font-medium text-ink">{licenseFile.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-ink">Click to upload trade license</p>
                    <p className="text-xs text-muted">PDF, JPG, PNG · max 5 MB</p>
                  </>
                )}
              </div>
            )}

            <input
              ref={licenseInputRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleLicenseFile}
            />

            {error && (
              <p className="rounded-card border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <Button
              onClick={handleSubmit}
              disabled={!licenseFile || isPending}
              className="w-full"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Submitting…
                </span>
              ) : (
                "Submit for Admin Approval"
              )}
            </Button>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-hairline pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Mobile Verification
          </p>
          <div className="flex items-center gap-2">
            {isMobileVerified ? (
              <>
                <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-success">Mobile number verified</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span className="text-sm text-amber-700">Mobile not verified —</span>
                <a href="/verify-mobile" className="text-sm font-medium text-primary underline underline-offset-2">
                  Verify now
                </a>
              </>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
