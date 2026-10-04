"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminUploadProfilePhoto } from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

/**
 * Upload photos into a member's gallery on their behalf.
 *
 * For intake the admin has already handled: they hold the person's photos and
 * should not have to sign in as them to attach them. Uploads land APPROVED,
 * because the reviewer is the one uploading, and PUBLIC unless the admin ticks
 * the blur gate on the member's behalf.
 *
 * Stays open after each upload so a gallery can be filled in one sitting.
 *
 * English-only, like the rest of /admin.
 */

const ERRORS: Record<string, string> = {
  FORBIDDEN: "You are not allowed to do this.",
  NO_PROFILE: "This account has no matrimonial profile to add photos to.",
  LIMIT: "This profile has reached the photo limit.",
  EMPTY: "Choose an image first.",
  TYPE: "Use a JPG, PNG or WebP image.",
  SIZE: "Image is too large (max 5 MB).",
  DECODE: "That image could not be read. Try another file.",
};

export function AdminPhotoUploadModal({
  userId,
  label,
  onClose,
}: {
  userId: string;
  /** Who the photos belong to, for the dialog title. */
  label: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [blurred, setBlurred] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(0);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("privacy", blurred ? "BLURRED" : "PUBLIC");
    setError(null);
    startTransition(async () => {
      const result = await adminUploadProfilePhoto(userId, formData);
      if (result.ok) {
        setUploaded((n) => n + 1);
        form.reset();
        router.refresh();
      } else {
        setError(ERRORS[result.error] ?? result.error);
      }
    });
  }

  return (
    <Modal open onClose={onClose} title={`Upload photos — ${label}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
            Image <span className="text-primary">*</span>
          </label>
          <input
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            className="w-full rounded-xl border border-hairline bg-white p-2.5 text-sm text-ink file:mr-3 file:rounded-pill file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary"
          />
          <p className="mt-1 text-xs text-muted">
            JPG, PNG or WebP, up to 5 MB. The first photo becomes their profile
            photo.
          </p>
        </div>

        <label className="flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={blurred}
            onChange={(e) => setBlurred(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-ink/30 text-primary focus:ring-primary/30"
          />
          <span>
            Keep this photo blurred
            <span className="block text-xs text-muted">
              Members then see a blurred version and must request access, which
              the member approves.
            </span>
          </span>
        </label>

        <p className="rounded-card border border-hairline bg-canvas px-3 py-2 text-xs text-muted">
          Uploaded as an admin, so the photo skips the moderation queue and is
          approved immediately.
        </p>

        {uploaded > 0 && !error && (
          <p className="rounded-card border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
            {uploaded === 1
              ? "1 photo uploaded."
              : `${uploaded} photos uploaded.`}{" "}
            Add another, or close when you are done.
          </p>
        )}
        {error && (
          <p className="rounded-card border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" fullWidth disabled={isPending}>
            {isPending ? "Uploading…" : "Upload photo"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            Close
          </Button>
        </div>
      </form>
    </Modal>
  );
}
