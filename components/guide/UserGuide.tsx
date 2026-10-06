"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { ChevronDownIcon, YoutubeIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { VideoModal } from "./VideoModal";
import {
  GUIDE_SECTIONS,
  PLACEHOLDER_VIDEO_ID,
  UI_TEXT,
  type GuideLang,
  type Localized,
} from "./guideContent";

export type { GuideLang } from "./guideContent";

/**
 * Self-contained User Guide: bilingual (EN/BN) content with a state-based
 * language toggle, a multi-open accordion of 8 sections, and a per-section
 * "Watch Video" button that opens a YouTube VideoModal.
 */
export function UserGuide({ initialLang = "en" }: { initialLang?: GuideLang }) {
  const [lang, setLang] = useState<GuideLang>(initialLang);
  const [openIds, setOpenIds] = useState<Set<number>>(new Set([1]));
  // Sections and sub-items share this shape, so either can drive the modal.
  const [activeVideo, setActiveVideo] = useState<{
    videoId: string;
    title: Localized;
  } | null>(null);

  function toggleSection(id: number) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div lang={lang}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            {UI_TEXT.heading[lang]}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink/70">
            {UI_TEXT.intro[lang]}
          </p>
        </div>
        <div
          role="group"
          aria-label="Language"
          className="inline-flex shrink-0 rounded-pill border border-hairline bg-surface p-1"
        >
          {(["en", "bn"] as const).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              aria-pressed={lang === code}
              className={cn(
                "rounded-pill px-4 py-1.5 text-sm transition-colors",
                lang === code
                  ? "bg-primary font-medium text-white"
                  : "text-ink/60 hover:text-ink",
              )}
            >
              {code === "en" ? "English" : "বাংলা"}
            </button>
          ))}
        </div>
      </div>

      <Card className="mt-8 divide-y divide-hairline overflow-hidden">
        {GUIDE_SECTIONS.map((section) => {
          const open = openIds.has(section.id);
          const panelId = `guide-section-${section.id}`;
          return (
            // Alternating row shade keeps adjacent items visually distinct.
            <div
              key={section.id}
              className={cn(section.id % 2 === 0 && "bg-canvas")}
            >
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                aria-expanded={open}
                aria-controls={panelId}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="text-sm font-semibold text-ink">
                  {section.title[lang]}
                </span>
                <ChevronDownIcon
                  width={18}
                  height={18}
                  className={cn(
                    "shrink-0 text-ink/40 transition-transform duration-150",
                    open && "rotate-180",
                  )}
                />
              </button>
              {open && (
                <div
                  id={panelId}
                  className="grid grid-cols-1 gap-6 p-4 md:grid-cols-3"
                >
                  {/* Video slot (1/3) — thumbnail card opens the modal. Odd
                      sections lead with the video; even sections flip it to
                      the right for a "Z" reading flow on desktop. */}
                  <button
                    type="button"
                    onClick={() => setActiveVideo(section)}
                    aria-label={UI_TEXT.watchVideo[lang]}
                    className={cn(
                      "group relative block aspect-video w-full self-start overflow-hidden rounded-card border border-hairline shadow-card md:col-span-1",
                      section.id % 2 === 0 && "md:order-last",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://img.youtube.com/vi/${section.videoId}/hqdefault.jpg`}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-ink/30 transition-colors group-hover:bg-ink/40">
                      <span className="flex h-11 w-11 items-center justify-center rounded-pill bg-white/90 text-primary">
                        <YoutubeIcon width={22} height={22} />
                      </span>
                    </span>
                  </button>

                  {/* Text slot (2/3) */}
                  <div className="md:col-span-2">
                    <p className="text-sm leading-relaxed text-ink/70">
                      {section.body[lang]}
                    </p>
                    {section.points && (
                      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink/70">
                        {section.points.map((point) => (
                          <li key={point.en}>{point[lang]}</li>
                        ))}
                      </ul>
                    )}
                    {section.subItems && (
                      <div className="mt-3 divide-y divide-hairline rounded-card border border-hairline bg-surface">
                        {section.subItems.map((subItem) => (
                          <div key={subItem.title.en} className="px-4 py-3">
                            <h3 className="text-sm font-semibold text-ink">
                              {subItem.title[lang]}
                            </h3>
                            <p className="mt-1 text-sm leading-relaxed text-ink/70">
                              {subItem.description[lang]}
                            </p>
                            {subItem.note && (
                              <p className="mt-1.5 text-xs font-medium text-accent">
                                ⚑ {subItem.note[lang]}
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => setActiveVideo(subItem)}
                              className="mt-2 inline-flex items-center gap-1.5 rounded-pill border border-hairline px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/5"
                            >
                              <YoutubeIcon width={15} height={15} />
                              {UI_TEXT.watchVideo[lang]}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </Card>

      <VideoModal
        open={activeVideo !== null}
        onClose={() => setActiveVideo(null)}
        videoId={activeVideo?.videoId ?? PLACEHOLDER_VIDEO_ID}
        title={activeVideo ? activeVideo.title[lang] : undefined}
      />
    </div>
  );
}
