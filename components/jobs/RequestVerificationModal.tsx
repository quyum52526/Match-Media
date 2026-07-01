"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { requestVerification } from "@/lib/actions/jobs";
import { DISTRICTS, upazilasFor } from "@/lib/constants/bdGeo";
import { MIN_VERIFICATION_BUDGET_BDT } from "@/lib/constants/jobs";

interface RequestVerificationModalProps {
  open: boolean;
  onClose: () => void;
}

const inputClass =
  "h-11 w-full rounded-xl border border-hairline bg-white px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";

const DISTRICT_PLACEHOLDER = "[District]";
const UPAZILA_PLACEHOLDER = "[Upozela]";

/** Builds the default verification-details message from the selected district/upazila. */
function buildVerificationMessage(district: string, upazila: string): string {
  const districtText = district || DISTRICT_PLACEHOLDER;
  const upazilaText = upazila || UPAZILA_PLACEHOLDER;
  return `I am looking for detailed information regarding a person residing in ${upazilaText}, ${districtText}. Please verify their residence and background. For more details, contact me.`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Wraps every occurrence of the district/upazila (resolved or placeholder) in a highlight span. */
function highlightMessage(text: string, district: string, upazila: string): string {
  const terms = [district || DISTRICT_PLACEHOLDER, upazila || UPAZILA_PLACEHOLDER].filter(Boolean);
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "g");
  return escapeHtml(text).replace(pattern, '<span class="text-blue-600 font-semibold">$1</span>');
}

export function RequestVerificationModal({
  open,
  onClose,
}: RequestVerificationModalProps) {
  const [district, setDistrict] = useState("");
  const [upazila, setUpazila] = useState("");
  const [details, setDetails] = useState(() => buildVerificationMessage("", ""));
  const [budget, setBudget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const editorRef = useRef<HTMLDivElement>(null);
  // Tracks whether the user has hand-edited the message, so district/upazila
  // changes stop overwriting their custom wording — we just re-highlight it.
  const messageEditedRef = useRef(false);

  // Regenerate (or re-highlight) the message whenever the district/upazila
  // selection changes, or when the modal is freshly reopened (editorRef is a
  // new DOM node at that point since Modal unmounts its children on close).
  useEffect(() => {
    if (!editorRef.current) return;
    const next = messageEditedRef.current
      ? details
      : buildVerificationMessage(district, upazila);
    editorRef.current.innerHTML = highlightMessage(next, district, upazila);
    setDetails(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [district, upazila, open]);

  function handleClose() {
    setDistrict("");
    setUpazila("");
    setDetails(buildVerificationMessage("", ""));
    setBudget("");
    messageEditedRef.current = false;
    setError(null);
    setSuccess(false);
    onClose();
  }

  function handleDistrictChange(value: string) {
    setDistrict(value);
    setUpazila(""); // reset upazila — it may not belong to the new district
  }

  function handleDetailsInput(e: React.FormEvent<HTMLDivElement>) {
    messageEditedRef.current = true;
    setDetails(e.currentTarget.textContent ?? "");
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
    const budgetBdt = parseFloat(budget);
    if (!budgetBdt || budgetBdt < MIN_VERIFICATION_BUDGET_BDT) {
      setError(`Minimum budget for verification is ৳${MIN_VERIFICATION_BUDGET_BDT}.`);
      return;
    }
    startTransition(async () => {
      const result = await requestVerification(district, details, budgetBdt);
      if (result.ok) {
        setSuccess(true);
      } else if (result.error === "MIN_BUDGET") {
        setError(`Minimum budget for verification is ৳${MIN_VERIFICATION_BUDGET_BDT}.`);
      } else if (result.error === "INVALID") {
        setError("Please fill in all fields.");
      } else {
        setError("You must be logged in to submit a request.");
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-ink">
                Target district <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={district}
                onChange={(e) => handleDistrictChange(e.target.value)}
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
              <label className="text-sm font-medium text-ink">Upazila</label>
              <select
                value={upazila}
                onChange={(e) => setUpazila(e.target.value)}
                disabled={!district}
                className={`${inputClass} disabled:cursor-not-allowed disabled:bg-ink/5 disabled:text-ink/40`}
              >
                <option value="">{district ? "Any" : "Select district first"}</option>
                {upazilasFor(district).map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.value} — {u.bn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-ink">
              Your budget (৳) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={MIN_VERIFICATION_BUDGET_BDT}
              step="1"
              required
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder={`e.g. ${MIN_VERIFICATION_BUDGET_BDT}`}
              className={inputClass}
            />
            {budget !== "" && parseFloat(budget) < MIN_VERIFICATION_BUDGET_BDT && (
              <p className="text-xs font-medium text-red-600">
                Minimum budget for verification is ৳{MIN_VERIFICATION_BUDGET_BDT}.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-ink">
              Verification details <span className="text-red-500">*</span>
            </label>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleDetailsInput}
              role="textbox"
              aria-multiline="true"
              aria-label="Verification details"
              className="min-h-[110px] w-full rounded-xl border border-hairline bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
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
