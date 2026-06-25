"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/Button";

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function StepPhotoUpload({ onNext, onBack }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed border-hairline bg-canvas py-10 transition hover:border-primary/50 hover:bg-primary/[0.02]"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleChange}
        />

        {preview ? (
          <img
            src={preview}
            alt="Preview"
            className="h-32 w-32 rounded-full object-cover ring-4 ring-primary/20"
          />
        ) : (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <p className="text-sm font-medium text-ink">Click or drag a photo here</p>
            <p className="text-xs text-muted">JPG, PNG · max 5 MB</p>
          </>
        )}
      </div>

      {preview && (
        <button
          type="button"
          onClick={() => setPreview(null)}
          className="w-full text-center text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
        >
          Remove photo
        </button>
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
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button onClick={onNext} className="flex-1">
          {preview ? "Continue" : "Skip for now"}
        </Button>
      </div>
    </div>
  );
}
