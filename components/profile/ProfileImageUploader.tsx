"use client";

import { useRef, useState, useTransition } from "react";

type UploadResult = { ok: true; key: string } | { error: string };

interface Props {
  /** Signed URL of the currently-stored image, or null if none uploaded yet. */
  initialImageUrl: string | null;
  /** Shown as a fallback (e.g. initials) when no image is set. */
  fallbackLabel: string;
  /** Server action that receives a FormData with a "file" field. */
  uploadAction: (formData: FormData) => Promise<UploadResult>;
  /** Alt text / upload button title. */
  alt?: string;
  /** Diameter of the avatar circle in Tailwind size units. Defaults to 20 (h-20 w-20). */
  size?: "sm" | "md" | "lg";
  /** Helper copy under the avatar. */
  hint?: string;
  /** Called with the new preview URL whenever the image changes. */
  onImageChange?: (previewUrl: string) => void;
}

const SIZE_CLASSES: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-14 w-14",
  md: "h-20 w-20",
  lg: "h-28 w-28",
};

/**
 * Reusable circular profile-image / logo uploader. Handles selection, an
 * instant client-side preview, uploading via the given server action, and
 * loading/error states. Used for agency logos and agent avatars alike.
 */
export function ProfileImageUploader({
  initialImageUrl,
  fallbackLabel,
  uploadAction,
  alt = "Profile photo",
  size = "md",
  hint = "Click to upload photo",
  onImageChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Only image files are accepted.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2 MB.");
      return;
    }

    // Client-side preview immediately.
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    onImageChange?.(url);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      try {
        const result = await uploadAction(formData);
        if ("error" in result) {
          setError(result.error);
          setPreviewUrl(initialImageUrl);
          onImageChange?.(initialImageUrl ?? "");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
        setPreviewUrl(initialImageUrl);
        onImageChange?.(initialImageUrl ?? "");
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className={`group relative flex ${SIZE_CLASSES[size]} shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-hairline bg-canvas transition hover:border-primary/60`}
        title={hint}
      >
        {previewUrl ? (
          <img src={previewUrl} alt={alt} className="h-full w-full object-cover" />
        ) : (
          <span className="text-xl font-bold text-ink/30">{fallbackLabel || "?"}</span>
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
      <p className="text-[11px] text-muted">{hint}</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
