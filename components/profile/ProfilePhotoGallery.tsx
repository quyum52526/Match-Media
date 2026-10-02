"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LockIcon,
  XIcon,
} from "@/components/ui/icons";
import { BlurredImage } from "./BlurredImage";
import type { ImagePrivacy, PhotoAccessState, ProfilePhoto } from "./types";

interface ProfilePhotoGalleryProps {
  photos: ProfilePhoto[];
  /** Privacy to show for the empty state (no photos at all). */
  fallbackPrivacy: ImagePrivacy;
  accessState: PhotoAccessState;
  name: string;
  adminView: boolean;
  onRequest?: () => void;
  pending?: boolean;
  requestDisabled?: boolean;
}

/**
 * Profile photo panel: the selected photo (with the usual privacy overlay),
 * a "2/4" counter and arrows, a thumbnail strip, and a full-screen viewer.
 * With one photo (or none) it renders exactly the single-photo layout.
 *
 * Every URL arrives already signed for this viewer — a gated photo's URL is
 * the pre-blurred derivative, so the CSS blur here is never the protection.
 */
export function ProfilePhotoGallery({
  photos,
  fallbackPrivacy,
  accessState,
  name,
  adminView,
  onRequest,
  pending,
  requestDisabled,
}: ProfilePhotoGalleryProps) {
  const t = useTranslations("Profile.photo");
  const [index, setIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const count = photos.length;
  const current = photos[Math.min(index, Math.max(count - 1, 0))];

  const go = useCallback(
    (delta: number) => setIndex((i) => (i + delta + count) % count),
    [count],
  );

  if (count === 0) {
    return (
      <BlurredImage
        privacy={fallbackPrivacy}
        state={accessState}
        name={name}
        onRequest={onRequest}
        pending={pending}
        requestDisabled={requestDisabled}
        adminView={adminView}
      />
    );
  }

  function openViewer(e: React.MouseEvent) {
    // Buttons/links inside the photo (request, admin shortcuts) keep their
    // own behaviour; only a click on the photo itself opens the viewer.
    if ((e.target as HTMLElement).closest("a,button")) return;
    if (current.revealed) setViewerOpen(true);
  }

  return (
    <div className="space-y-3">
      <div
        className={"relative" + (current.revealed ? " cursor-zoom-in" : "")}
        onClick={openViewer}
      >
        <BlurredImage
          key={current.id}
          privacy={current.privacy}
          state={accessState}
          src={current.url}
          name={name}
          onRequest={onRequest}
          pending={pending}
          requestDisabled={requestDisabled}
          adminView={adminView}
          moderation={current.moderation}
        />

        {count > 1 && (
          <>
            <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold tabular-nums text-white">
              {t("gallery.count", { n: String(index + 1), total: String(count) })}
            </span>
            <NavButton side="left" label={t("gallery.prev")} onClick={() => go(-1)} />
            <NavButton side="right" label={t("gallery.next")} onClick={() => go(1)} />
          </>
        )}
      </div>

      {count > 1 && (
        <ul className="grid grid-cols-6 gap-2">
          {photos.map((photo, i) => (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={t("gallery.thumb", { n: String(i + 1), total: String(count) })}
                aria-current={i === index}
                className={
                  "relative block aspect-square w-full overflow-hidden rounded-lg bg-ink/5 ring-offset-2 transition " +
                  (i === index ? "ring-2 ring-primary" : "opacity-80 hover:opacity-100")
                }
              >
                {photo.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.url}
                    alt=""
                    className={
                      "h-full w-full object-cover" +
                      (photo.revealed ? "" : " scale-110 blur-md")
                    }
                  />
                )}
                {!photo.revealed && (
                  <span className="absolute inset-0 flex items-center justify-center bg-ink/20 text-white">
                    <LockIcon width={14} height={14} />
                  </span>
                )}
                {photo.moderation && photo.moderation !== "APPROVED" && (
                  <span
                    className={
                      "absolute right-1 top-1 h-2.5 w-2.5 rounded-full ring-2 ring-white " +
                      (photo.moderation === "PENDING" ? "bg-accent" : "bg-red-600")
                    }
                    aria-hidden
                  />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {viewerOpen && (
        <PhotoViewer
          photos={photos}
          index={index}
          onIndex={setIndex}
          onClose={() => setViewerOpen(false)}
          name={name}
        />
      )}
    </div>
  );
}

function NavButton({
  side,
  label,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeftIcon : ChevronRightIcon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={
        "absolute top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink shadow-sm transition hover:bg-white " +
        (side === "left" ? "left-2" : "right-2")
      }
    >
      <Icon width={18} height={18} />
    </button>
  );
}

/** Full-screen viewer: arrows / ← → to browse, Esc or backdrop to close. */
function PhotoViewer({
  photos,
  index,
  onIndex,
  onClose,
  name,
}: {
  photos: ProfilePhoto[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  name: string;
}) {
  const t = useTranslations("Profile.photo");
  const count = photos.length;
  const photo = photos[index];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onIndex((index - 1 + count) % count);
      else if (e.key === "ArrowRight") onIndex((index + 1) % count);
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [index, count, onIndex, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("alt", { name })}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t("gallery.close")}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <XIcon width={20} height={20} />
      </button>

      {count > 1 && (
        <span className="absolute left-4 top-5 text-sm font-semibold tabular-nums text-white/80">
          {t("gallery.count", { n: String(index + 1), total: String(count) })}
        </span>
      )}

      <div
        className="relative flex max-h-full max-w-full items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {photo.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.url}
            alt={t("alt", { name })}
            className={
              "max-h-[85vh] max-w-[92vw] rounded-lg object-contain" +
              (photo.revealed ? "" : " blur-2xl")
            }
          />
        ) : (
          <div className="h-[60vh] w-[45vh] rounded-lg bg-white/10" />
        )}
        {!photo.revealed && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-ink">
              <LockIcon width={24} height={24} />
            </span>
          </span>
        )}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label={t("gallery.prev")}
            onClick={(e) => {
              e.stopPropagation();
              onIndex((index - 1 + count) % count);
            }}
            className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <ChevronLeftIcon width={22} height={22} />
          </button>
          <button
            type="button"
            aria-label={t("gallery.next")}
            onClick={(e) => {
              e.stopPropagation();
              onIndex((index + 1) % count);
            }}
            className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <ChevronRightIcon width={22} height={22} />
          </button>
        </>
      )}
    </div>
  );
}
