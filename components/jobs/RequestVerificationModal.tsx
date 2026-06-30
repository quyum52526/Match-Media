"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { requestVerification } from "@/lib/actions/jobs";
import { DISTRICTS } from "@/lib/constants/bdGeo";

interface RequestVerificationModalProps {
  open: boolean;
  onClose: () => void;
}

const inputClass =
  "h-11 w-full rounded-xl border border-hairline bg-white px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";

export function RequestVerificationModal({
  open,
  onClose,
}: RequestVerificationModalProps) {
  const [district, setDistrict] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    setDistrict("");
    setDetails("");
    setError(null);
    setSuccess(false);
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!district) {
      setError("Please select a district.");
      return;
    }
    if (details.trim().length < 20) {
      setError("Please provide at least 20 characters of detail.");
      return;
    }
    startTransition(async () => {
      const result = await requestVerification(district, details);
      if (result.ok) {
        setSuccess(true);
      } else {
        setError(
          result.error === "INVALID"
            ? "Please fill in all fields."
            : "You must be logged in to submit a request.",
        );
      }
    });
  }

  return (
    <Modal open={open} onClose={handleClose} title="Request Verification">
      {success ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
            <svg viewBox="0 0 20 20" fill="none" className="h-6 w-6 text-success">
              <path
                d="M4 10l4 4 8-8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <p className="font-semibold text-ink">Request submitted!</p>
          <p className="text-sm text-muted">
            Your verification request is now live on the Job Board. A verified
            agent in {district} will review and bid on your job.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            className="mt-2"
          >
            Close
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted">
            Submit a verification request and our network of verified agents
            will bid to help you. You review bids and choose who to work with.
          </p>

          <div className="space-y-1">
            <label className="text-sm font-medium text-ink">
              Target district <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className={inputClass}
            >
              <option value="">Select district…</option>
              {DISTRICTS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.value} — {d.bn}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-ink">
              Verification details <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              required
              minLength={20}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="e.g. Please verify the residence and family background of the person at the following address…"
              className="w-full rounded-xl border border-hairline bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-right text-xs text-ink/40">
              {details.trim().length} / 20 min
            </p>
          </div>

          {error && (
            <p className="text-sm font-medium text-red-600">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isPending}
              className="flex-1"
            >
              {isPending ? "Submitting…" : "Submit request"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
