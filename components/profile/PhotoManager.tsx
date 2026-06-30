"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  uploadProfilePhoto,
  deleteProfilePhoto,
  setPrimaryPhoto,
  setPhotoPrivacy,
  type PhotoActionResult,
} from "@/lib/actions/photos";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { StarIcon, LockIcon, CheckIcon, ClockIcon } from "@/components/ui/icons";
import type { OwnPhoto } from "@/lib/data/photos";

// Client-side pre-checks mirror the server limits in lib/storage/images.ts.
// The server remains the source of truth; these just give instant feedback.
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

// Files already under this threshold are uploaded as-is (skip compress round-trip).
const COMPRESS_THRESHOLD = 300 * 1024; // 300 KB
// Canvas output is capped at 1920 px on the longest edge.
const MAX_DIM = 1920;
// Quality ladder — each step is tried until the output fits under target size.
const TARGET_BYTES = 700 * 1024;
const QUALITY_STEPS = [0.88, 0.78, 0.68, 0.58];

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      quality,
    ),
  );
}

async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  let { width, height } = bitmap;
  if (width > MAX_DIM || height > MAX_DIM) {
    const scale = MAX_DIM / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  for (const quality of QUALITY_STEPS) {
    const blob = await canvasToBlob(canvas, quality);
    if (blob.size <= TARGET_BYTES) return blob;
  }
  // Fallback: return at the lowest quality if still over target
  return canvasToBlob(canvas, QUALITY_STEPS.at(-1)!);
}

export function PhotoManager({
  photos,
  maxPhotos,
  clientId,
}: {
  photos: OwnPhoto[];
  maxPhotos: number;
  /** When set, all photo actions target this client profile (MEDIA agency flow). */
  clientId?: string;
}) {
  const t = useTranslations("ProfileEdit.photos");
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = pending || compressing;
  const atLimit = photos.length >= maxPhotos;

  function run(action: () => Promise<PhotoActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
      else router.refresh(); // pull fresh server data (signed URLs, ordering)
    });
  }

  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file later
    if (!file) return;

    // Instant MIME check — no round-trip needed.
    if (!ALLOWED_MIME.includes(file.type)) return setError("TYPE");

    // Compress on the client before handing off to the server action.
    // Small files skip the canvas round-trip entirely.
    let uploadBlob: Blob = file;
    if (file.size > COMPRESS_THRESHOLD) {
      setCompressing(true);
      try {
        uploadBlob = await compressImage(file);
      } catch {
        setCompressing(false);
        return setError("DECODE");
      }
      setCompressing(false);
    }

    const formData = new FormData();
    // Rename to .jpg since compressImage always outputs JPEG.
    const uploadName = file.name.replace(/\.[^.]+$/, ".jpg");
    formData.append("photo", uploadBlob, uploadName);
    if (clientId) formData.append("clientId", clientId);
    run(() => uploadProfilePhoto(formData));
  }

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{t("title")}</CardTitle>
          <span className="font-body text-xs text-ink/50">
            {t("count", { count: photos.length, max: maxPhotos })}
          </span>
        </div>
        <p className="text-sm text-ink/60">{t("subtitle")}</p>

        {photos.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((photo) => (
              <li
                key={photo.id}
                className="group relative overflow-hidden rounded-xl border border-ink/10 bg-ink/5"
              >
                <div className="aspect-[3/4] w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* Status chips */}
                <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                  {photo.isPrimary && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-white">
                      <StarIcon width={11} height={11} />
                      {t("primaryBadge")}
                    </span>
                  )}
                  {photo.moderationStatus === "PENDING" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-white">
                      <ClockIcon width={10} height={10} />
                      {t("status.PENDING")}
                    </span>
                  )}
                  {photo.moderationStatus === "REJECTED" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-medium text-white">
                      {t("status.REJECTED")}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full bg-ink/70 px-2 py-0.5 text-[11px] font-medium text-white">
                    {photo.privacy === "PUBLIC" ? (
                      t("publicBadge")
                    ) : (
                      <>
                        <LockIcon width={10} height={10} />
                        {t("blurredBadge")}
                      </>
                    )}
                  </span>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap gap-1.5 p-2">
                  {!photo.isPrimary && (
                    <button
                      type="button"
                      onClick={() => run(() => setPrimaryPhoto(photo.id, clientId))}
                      disabled={busy}
                      className="rounded-lg bg-ink/5 px-2 py-1 text-[11px] font-medium text-ink hover:bg-ink/10 disabled:opacity-50"
                    >
                      {t("makePrimary")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      run(() =>
                        setPhotoPrivacy(
                          photo.id,
                          photo.privacy === "PUBLIC" ? "BLURRED" : "PUBLIC",
                          clientId,
                        ),
                      )
                    }
                    disabled={busy}
                    className="rounded-lg bg-ink/5 px-2 py-1 text-[11px] font-medium text-ink hover:bg-ink/10 disabled:opacity-50"
                  >
                    {photo.privacy === "PUBLIC" ? t("makeBlurred") : t("makePublic")}
                  </button>
                  <button
                    type="button"
                    onClick={() => run(() => deleteProfilePhoto(photo.id, clientId))}
                    disabled={busy}
                    className="rounded-lg bg-red-50 px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                  >
                    {t("delete")}
                  </button>
                </div>

                {photo.moderationStatus === "REJECTED" && photo.rejectionReason && (
                  <p className="px-2 pb-2 text-[11px] text-red-600">
                    {photo.rejectionReason}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        <input
          ref={fileRef}
          type="file"
          accept={ALLOWED_MIME.join(",")}
          onChange={onFilePicked}
          className="hidden"
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={busy || atLimit}
          >
            {busy
              ? t("uploading")
              : photos.length === 0
                ? t("addFirst")
                : t("add")}
          </Button>
          {atLimit && (
            <span className="text-xs text-ink/50">{t("limitNote")}</span>
          )}
          {!busy && error === null && photos.length > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-primary">
              <CheckIcon width={14} height={14} />
              {t("savedHint")}
            </span>
          )}
        </div>

        {error && (
          <p className="text-sm font-medium text-red-600">{t(`errors.${error}`)}</p>
        )}
        <p className="text-xs text-ink/45">{t("privacyHint")}</p>
      </CardBody>
    </Card>
  );
}
