"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminRejectProfile } from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

/**
 * Reject a profile — a hard delete of the account, its photos and its
 * documents, which is what frees the email and mobile for re-registration.
 *
 * Confirmation is a modal rather than a window.confirm(), because the action is
 * irreversible and the consequence ("the email and phone number are released")
 * is the part the admin needs to read before clicking, not a line they dismiss
 * by reflex. An optional reason is recorded in the server log; it is not
 * emailed, since the account is about to stop existing.
 *
 * English-only, like the rest of /admin.
 */

const ERRORS: Record<string, string> = {
  FORBIDDEN: "You are not allowed to do this.",
  NOT_FOUND: "That profile no longer exists.",
  SELF: "You cannot reject your own account.",
  IS_ADMIN: "Admin accounts cannot be rejected from here.",
  HAS_ASSIGNMENTS:
    "This account is tied to verification assignments. Cancel or reassign those first — they carry fees and another agent's work.",
};

export function RejectProfileButton({
  profileId,
  label,
  size = "sm",
}: {
  profileId: string;
  /** Who is being rejected, shown in the confirmation. */
  label: string;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reject() {
    setError(null);
    startTransition(async () => {
      const result = await adminRejectProfile(profileId, reason);
      if (result.ok) {
        setOpen(false);
        setReason("");
        router.refresh();
      } else {
        setError(ERRORS[result.error] ?? result.error);
      }
    });
  }

  return (
    <>
      <Button
        size={size}
        variant="outline"
        onClick={() => setOpen(true)}
        className="border-red-300 text-red-700 hover:bg-red-50"
      >
        Reject
      </Button>

      {open && (
        <Modal open onClose={() => setOpen(false)} title="Reject this profile?">
          <div className="space-y-4">
            <p className="text-sm text-ink">
              Are you sure you want to reject and delete{" "}
              <span className="font-semibold">{label}</span>? The email and
              phone number will be freed for re-registration.
            </p>
            <p className="rounded-card border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              This permanently deletes the account, its profile, every photo and
              every uploaded document. It cannot be undone, and nothing about
              this person is kept.
            </p>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
                Reason (optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Recorded in the server log for your own reference"
                className="w-full rounded-xl border border-hairline bg-white p-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {error && (
              <p className="rounded-card border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                fullWidth
                disabled={isPending}
                onClick={reject}
                className="bg-red-600 hover:bg-red-700"
              >
                {isPending ? "Deleting…" : "Yes, reject and delete"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
