"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { applyToJob } from "@/lib/actions/jobs";

interface ApplyModalProps {
  jobId: string;
  jobTitle: string;
  budgetAmount: number; // poisha
  open: boolean;
  onClose: () => void;
}

const inputClass =
  "h-11 w-full rounded-xl border border-hairline bg-white px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Please log in to apply.",
  NOT_AGENT: "Only verified agents can apply for jobs.",
  ALREADY_APPLIED: "You have already applied for this job.",
  JOB_CLOSED: "This job is no longer accepting applications.",
  INVALID: "Please enter a valid bid amount and delivery time.",
};

export function ApplyModal({
  jobId,
  jobTitle,
  budgetAmount,
  open,
  onClose,
}: ApplyModalProps) {
  const [bidAmount, setBidAmount] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    setError(null);
    setSuccess(false);
    setBidAmount("");
    setDeliveryDays("");
    setNote("");
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const bid = parseFloat(bidAmount);
    const days = parseInt(deliveryDays, 10);
    if (!bid || bid <= 0 || !days || days <= 0) {
      setError(ERROR_MESSAGES.INVALID);
      return;
    }
    startTransition(async () => {
      const result = await applyToJob(jobId, bid, days, note);
      if (result.ok) {
        setSuccess(true);
      } else {
        setError(ERROR_MESSAGES[result.error] ?? "Something went wrong.");
      }
    });
  }

  const budgetBdt = (budgetAmount / 100).toLocaleString("en-BD");
  const bidValue = parseFloat(bidAmount);
  const hasValidBid = !!bidValue && bidValue > 0;
  const platformFee = hasValidBid ? bidValue * 0.2 : 0;
  const agentShare = hasValidBid ? bidValue - platformFee : 0;

  return (
    <Modal open={open} onClose={handleClose} title={`Apply — ${jobTitle}`}>
      {success ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
            <svg viewBox="0 0 20 20" fill="none" className="h-6 w-6 text-success">
              <path d="M4 10l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <p className="font-semibold text-ink">Application submitted!</p>
          <p className="text-sm text-muted">
            The job poster will review your bid and get back to you.
          </p>
          <Button variant="outline" size="sm" onClick={handleClose} className="mt-2">
            Close
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl border border-hairline bg-canvas px-4 py-3 text-sm text-ink/70">
            Job budget: <span className="font-semibold text-ink">৳{budgetBdt}</span>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-ink">
              Your bid (৳) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="1"
              required
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder="e.g. 400"
              className={inputClass}
            />
            {hasValidBid && (
              <p className="text-xs text-ink/50">
                Platform fee (20%): ৳{platformFee.toLocaleString("en-BD")} · You receive: ৳
                {agentShare.toLocaleString("en-BD")}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-ink">
              Estimated delivery (days) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="1"
              required
              value={deliveryDays}
              onChange={(e) => setDeliveryDays(e.target.value)}
              placeholder="e.g. 3"
              className={inputClass}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-ink">
              Note{" "}
              <span className="font-normal text-ink/40">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Briefly describe your approach or experience…"
              className="w-full rounded-xl border border-hairline bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
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
              {isPending ? "Submitting…" : "Submit bid"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
