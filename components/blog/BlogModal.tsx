"use client";

import { useEffect } from "react";
import { XIcon } from "@/components/ui/icons";

export interface BlogPost {
  title: string;
  date: string;
  excerpt: string;
  body: {
    intro: string;
    points: { heading: string; text: string }[];
  };
}

interface BlogModalProps {
  /** The post to show; null renders nothing (modal closed). */
  post: BlogPost | null;
  onClose: () => void;
}

/**
 * Full-article reader modal. Follows the same conventions as
 * components/ui/Modal (Escape / backdrop-click close, body scroll lock) but
 * is wider (article width) and scrolls internally for long content.
 */
export function BlogModal({ post, onClose }: BlogModalProps) {
  const open = post !== null;

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

  if (!post) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={post.title}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <article className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-card bg-surface shadow-card">
        {/* Header: date + title, sticky while the article scrolls */}
        <div className="flex items-start justify-between gap-4 border-b border-hairline p-5 sm:p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink/40">
              {post.date}
            </p>
            <h2 className="mt-1 font-display text-lg font-semibold leading-snug text-ink sm:text-xl">
              {post.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-1 text-ink/50 transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <XIcon width={18} height={18} />
          </button>
        </div>

        {/* Body: intro paragraph + numbered tip sections */}
        <div className="overflow-y-auto p-5 sm:p-6">
          <p className="text-sm leading-7 text-ink/80">{post.body.intro}</p>
          <ol className="mt-5 space-y-4">
            {post.body.points.map((point, i) => (
              <li key={point.heading} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-body text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    {point.heading}
                  </h3>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink/70">
                    {point.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </article>
    </div>
  );
}
