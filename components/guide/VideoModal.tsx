"use client";

import { useEffect } from "react";
import { XIcon } from "@/components/ui/icons";

interface VideoModalProps {
  open: boolean;
  onClose: () => void;
  /** YouTube video ID (the part after `watch?v=`). */
  videoId: string;
  title?: string;
}

/**
 * YouTube player modal — 60% of the viewport width on desktop (near-full
 * width on small screens), centered over a dark backdrop. Closes on backdrop
 * click or Escape and locks body scroll while open. Follows the same
 * conventions as components/ui/Modal but keeps the chrome minimal so the
 * video stays the focus.
 */
export function VideoModal({ open, onClose, videoId, title }: VideoModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title ?? "Video"}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" aria-hidden />
      {/* Clicks inside the player must not bubble to the backdrop handler. */}
      <div
        className="relative z-10 w-[92vw] md:w-[60vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close video"
          className="absolute -top-10 right-0 rounded-pill p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <XIcon width={20} height={20} />
        </button>
        <div className="aspect-video w-full overflow-hidden rounded-card bg-secondary shadow-card">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
            title={title ?? "MatchMedia guide video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  );
}
