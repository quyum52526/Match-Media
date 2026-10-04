"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { uploadProfilePhoto } from "@/lib/actions/photos";

interface Props {
  onNext: () => void;
  onBack: () => void;
}

// Mirrors lib/storage/images.ts (validated again on the server).
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

const ERRORS: Record<string, string> = {
  TYPE: "Please choose a JPG, PNG or WebP image.",
  SIZE: "That photo is larger than 5 MB. Please choose a smaller one.",
  EMPTY: "That file looks empty. Please choose another photo.",
  DECODE: "We couldn't read that image. Please try a different photo.",
  LIMIT: "You've reached the photo limit. Manage photos from your profile.",
  NO_PROFILE: "Please complete your basic details first.",
  UPLOAD: "Upload failed. Please check your connection and try again.",
};

export function StepPhotoUpload({ onNext, onBack }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  // Privacy-first default, matching the app-wide default for new photos.
  // Unchecked by default: photos are PUBLIC unless the member opts into the
  // blur gate. Ticking this is what sends privacy=BLURRED with the upload.
  const [blurred, setBlurred] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Release the object URL when the preview changes or the step unmounts.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handleFile(f: File) {
    setError(null);
    if (!ALLOWED.includes(f.type)) return setError(ERRORS.TYPE);
    if (f.size > MAX_BYTES) return setError(ERRORS.SIZE);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = ""; // allow re-picking the same file after "Remove"
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  function removePhoto() {
    setFile(null);
    setPreview(null);
    setError(null);
  }

  function handleContinue() {
    if (!file) return onNext(); // "Skip for now"
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("photo", file);
      formData.set("privacy", blurred ? "BLURRED" : "PUBLIC");
      // The onboarding photo IS the profile photo, even before any gallery.
      formData.set("makePrimary", "1");
      try {
        const result = await uploadProfilePhoto(formData);
        if (result.ok) return onNext();
        setError(ERRORS[result.error] ?? ERRORS.UPLOAD);
      } catch {
        setError(ERRORS.UPLOAD);
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      <div
        onClick={() => !isPending && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed border-hairline bg-canvas py-10 transition hover:border-primary/50 hover:bg-primary/[0.02]"
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED.join(",")}
          className="sr-only"
          onChange={handleChange}
        />

        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Preview"
            className={
              "h-32 w-32 rounded-full object-cover ring-4 ring-primary/20 transition" +
              (blurred ? " blur-md" : "")
            }
          />
        ) : (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <p className="text-sm font-medium text-ink">Click or drag a photo here</p>
            <p className="text-xs text-muted">JPG, PNG, WebP · max 5 MB</p>
          </>
        )}
      </div>

      {preview && (
        <button
          type="button"
          onClick={removePhoto}
          disabled={isPending}
          className="w-full text-center text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
        >
          Remove photo
        </button>
      )}

      {/* Visibility choice — saved as the photo's privacy (BLURRED / PUBLIC) */}
      <label className="flex cursor-pointer items-start gap-3 rounded-card border border-hairline bg-white px-4 py-3">
        <input
          type="checkbox"
          checked={blurred}
          onChange={(e) => setBlurred(e.target.checked)}
          disabled={isPending}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary"
        />
        <span className="space-y-1">
          <span className="block text-sm font-medium text-ink">
            Blur / hide my profile photo to protect privacy
          </span>
          <span className="block text-xs leading-relaxed text-muted">
            {blurred
              ? "Members see a blurred photo and must send a photo request, which you approve."
              : "Members will see your photo clearly once it's approved by our team."}
          </span>
          <span className="block text-xs leading-relaxed text-muted">
            টিক দিলে ছবি ব্লার/হাইড থাকবে, আনচেক থাকলে পাবলিকলি আনব্লারড থাকবে। পরে প্রোফাইল থেকে বদলাতে পারবেন।
          </span>
        </span>
      </label>

      {error && (
        <p role="alert" className="rounded-card border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Pending review notice */}
      <div className="flex items-start gap-2.5 rounded-card bg-accent/10 px-4 py-3">
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <p className="text-xs leading-relaxed text-ink/70">
          Your photo will be <span className="font-semibold text-ink">pending admin review</span> before it becomes visible to other members. This usually takes under 24 hours.
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={isPending} className="flex-1">
          Back
        </Button>
        <Button onClick={handleContinue} disabled={isPending} className="flex-1">
          {isPending ? "Uploading…" : file ? "Continue" : "Skip for now"}
        </Button>
      </div>
    </div>
  );
}
