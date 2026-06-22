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
import { StarIcon, LockIcon, CheckIcon } from "@/components/ui/icons";
import type { OwnPhoto } from "@/lib/data/photos";

// Client-side pre-checks mirror the server limits in lib/storage/images.ts.
// The server remains the source of truth; these just give instant feedback.
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function PhotoManager({
  photos,
  maxPhotos,
}: {
  photos: OwnPhoto[];
  maxPhotos: number;
}) {
  const t = useTranslations("ProfileEdit.photos");
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const atLimit = photos.length >= maxPhotos;

  function run(action: () => Promise<PhotoActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
      else router.refresh(); // pull fresh server data (signed URLs, ordering)
    });
  }

  function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file later
    if (!file) return;

    // Instant client-side validation before the upload round-trip.
    if (!ALLOWED_MIME.includes(file.type)) return setError("TYPE");
    if (file.size > MAX_UPLOAD_BYTES) return setError("SIZE");

    const formData = new FormData();
    formData.append("photo", file);
    run(() => uploadProfilePhoto(formData));
  }

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{t("title")}</CardTitle>
          <span className="font-sans text-xs text-charcoal/50">
            {t("count", { count: photos.length, max: maxPhotos })}
          </span>
        </div>
        <p className="text-sm text-charcoal/60">{t("subtitle")}</p>

        {photos.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((photo) => (
              <li
                key={photo.id}
                className="group relative overflow-hidden rounded-xl border border-charcoal/10 bg-charcoal/5"
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
                    <span className="inline-flex items-center gap-1 rounded-full bg-trustGreen px-2 py-0.5 text-[11px] font-medium text-white">
                      <StarIcon width={11} height={11} />
                      {t("primaryBadge")}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full bg-charcoal/70 px-2 py-0.5 text-[11px] font-medium text-white">
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
                      onClick={() => run(() => setPrimaryPhoto(photo.id))}
                      disabled={pending}
                      className="rounded-lg bg-charcoal/5 px-2 py-1 text-[11px] font-medium text-charcoal hover:bg-charcoal/10 disabled:opacity-50"
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
                        ),
                      )
                    }
                    disabled={pending}
                    className="rounded-lg bg-charcoal/5 px-2 py-1 text-[11px] font-medium text-charcoal hover:bg-charcoal/10 disabled:opacity-50"
                  >
                    {photo.privacy === "PUBLIC" ? t("makeBlurred") : t("makePublic")}
                  </button>
                  <button
                    type="button"
                    onClick={() => run(() => deleteProfilePhoto(photo.id))}
                    disabled={pending}
                    className="rounded-lg bg-red-50 px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                  >
                    {t("delete")}
                  </button>
                </div>
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
            disabled={pending || atLimit}
          >
            {pending
              ? t("uploading")
              : photos.length === 0
                ? t("addFirst")
                : t("add")}
          </Button>
          {atLimit && (
            <span className="text-xs text-charcoal/50">{t("limitNote")}</span>
          )}
          {!pending && error === null && photos.length > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-trustGreen">
              <CheckIcon width={14} height={14} />
              {t("savedHint")}
            </span>
          )}
        </div>

        {error && (
          <p className="text-sm font-medium text-red-600">{t(`errors.${error}`)}</p>
        )}
        <p className="text-xs text-charcoal/45">{t("privacyHint")}</p>
      </CardBody>
    </Card>
  );
}
