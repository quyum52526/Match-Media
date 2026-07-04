"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { ChevronDownIcon, YoutubeIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { VideoModal } from "./VideoModal";

export type GuideLang = "en" | "bn";

interface Localized {
  en: string;
  bn: string;
}

export interface GuideSubItem {
  /** YouTube video ID specific to this sub-item. */
  videoId: string;
  title: Localized;
  description: Localized;
  /** Optional callout rendered below the description (e.g. requirements). */
  note?: Localized;
}

export interface GuideSection {
  id: number;
  /** YouTube video ID for the section-level "Watch Video" button. */
  videoId: string;
  title: Localized;
  body: Localized;
  /** Optional bullet points rendered under the body. */
  points?: Localized[];
  /**
   * Optional rich sub-items (title + description + own video). When present,
   * each gets its own "Watch Video" button and the section-level button is
   * omitted.
   */
  subItems?: GuideSubItem[];
}

/** Placeholder until per-section walkthrough videos are produced. */
const PLACEHOLDER_VIDEO_ID = "M7lc1UVf-VE";

const UI_TEXT: Record<string, Localized> = {
  heading: { en: "User Guide", bn: "ব্যবহার নির্দেশিকা" },
  intro: {
    en: "New to MatchMedia? Here's how to get started in a few simple steps.",
    bn: "MatchMedia-তে নতুন? কয়েকটি সহজ ধাপে শুরু করুন।",
  },
  watchVideo: { en: "Watch Video", bn: "ভিডিও দেখুন" },
};

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 1,
    videoId: PLACEHOLDER_VIDEO_ID,
    title: { en: "1. Create Your Profile", bn: "১. প্রোফাইল তৈরি করুন" },
    body: {
      en: "Sign up with your name, email and mobile number, then complete your profile — photos, education, profession, family details and what you're looking for in a partner. The more complete your profile, the better your matches.",
      bn: "নাম, email ও মোবাইল নম্বর দিয়ে sign up করুন, তারপর প্রোফাইল সম্পূর্ণ করুন — ছবি, শিক্ষা, পেশা, পারিবারিক তথ্য এবং আপনি কেমন জীবনসঙ্গী খুঁজছেন। প্রোফাইল যত সম্পূর্ণ হবে, match তত ভালো হবে।",
    },
  },
  {
    id: 2,
    videoId: PLACEHOLDER_VIDEO_ID,
    title: { en: "2. Get Verified", bn: "২. Verified হন" },
    body: {
      en: "Verification keeps the community safe and unlocks messaging and calling with your matches. Complete these checks — profiles with the \"Verified\" and \"Premium Verified\" badges get far more responses:",
      bn: "Verification community-কে নিরাপদ রাখে এবং match-দের সাথে messaging ও calling চালু করে। এই ধাপগুলো সম্পন্ন করুন — \"Verified\" ও \"Premium Verified\" badge-সহ প্রোফাইল অনেক বেশি সাড়া পায়:",
    },
    // Unique placeholder video per verification step — replace with the real
    // walkthroughs once produced.
    subItems: [
      {
        videoId: "kJQP7kiw5Fk",
        title: { en: "Mobile Number", bn: "মোবাইল নম্বর" },
        description: {
          en: "Verify your mobile number with the OTP code sent by SMS. This is required before you can message or call your matches.",
          bn: "SMS-এ পাঠানো OTP code দিয়ে মোবাইল নম্বর verify করুন। Match-দের সাথে message বা call করার আগে এটি বাধ্যতামূলক।",
        },
      },
      {
        videoId: "9bZkp7q19f0",
        title: { en: "Email", bn: "Email" },
        description: {
          en: "Confirm your email address to secure your account and receive important notifications about interests and matches.",
          bn: "Account নিরাপদ রাখতে এবং interest ও match-সংক্রান্ত গুরুত্বপূর্ণ notification পেতে email address নিশ্চিত করুন।",
        },
      },
      {
        videoId: "OPf0YbXqDm0",
        title: { en: "Profile Photo", bn: "প্রোফাইল ছবি" },
        description: {
          en: "Upload a clear, recent photo of yourself. Every photo is reviewed by our moderation team before it becomes visible to other members.",
          bn: "নিজের একটি স্পষ্ট, সাম্প্রতিক ছবি upload করুন। প্রতিটি ছবি অন্য সদস্যদের কাছে দৃশ্যমান হওয়ার আগে আমাদের moderation team review করে।",
        },
      },
      {
        videoId: "hT_nvWreIhg",
        title: { en: "NID", bn: "NID (জাতীয় পরিচয়পত্র)" },
        description: {
          en: "Submit your National ID so our agents can confirm your identity and location — this is what earns the \"Verified\" badge on your profile.",
          bn: "National ID জমা দিন যাতে আমাদের agent-রা আপনার পরিচয় ও অবস্থান নিশ্চিত করতে পারেন — এটিই আপনার প্রোফাইলে \"Verified\" badge এনে দেয়।",
        },
      },
      {
        videoId: "fJ9rUzIMcZQ",
        title: { en: "Trade License", bn: "Trade License (ট্রেড লাইসেন্স)" },
        description: {
          en: "Submit a valid trade license so the platform can confirm your organization is a legitimate, registered business.",
          bn: "বৈধ trade license জমা দিন যাতে platform নিশ্চিত হতে পারে আপনার প্রতিষ্ঠান একটি বৈধ, নিবন্ধিত ব্যবসা।",
        },
        note: {
          en: "Required for Media and Agent profiles.",
          bn: "Media ও Agent প্রোফাইলের জন্য বাধ্যতামূলক।",
        },
      },
    ],
  },
  {
    id: 3,
    videoId: PLACEHOLDER_VIDEO_ID,
    title: { en: "3. Browse & Filter", bn: "৩. Browse ও Filter করুন" },
    body: {
      en: "Use filters like age, district, profession and education to find profiles that match what you're looking for. The quick filters on the homepage are a fast way to start your first search.",
      bn: "বয়স, জেলা, পেশা ও শিক্ষা filter ব্যবহার করে আপনার পছন্দের প্রোফাইল খুঁজুন। Homepage-এর quick filter দিয়ে প্রথম search দ্রুত শুরু করতে পারেন।",
    },
  },
  {
    id: 4,
    videoId: PLACEHOLDER_VIDEO_ID,
    title: { en: "4. Send an Interest", bn: "৪. Interest পাঠান" },
    body: {
      en: "Found someone promising? Send an Interest to let them know you'd like to connect — you can include a short introductory note (up to 200 characters) to say something about yourself.",
      bn: "সম্ভাবনাময় কাউকে পেলেন? Connect করতে চাইলে একটি Interest পাঠান — চাইলে নিজের সম্পর্কে সংক্ষিপ্ত একটি introductory note (সর্বোচ্চ ২০০ অক্ষর) যোগ করতে পারেন।",
    },
  },
  {
    id: 5,
    videoId: PLACEHOLDER_VIDEO_ID,
    title: {
      en: "5. Manage Interests & Matches",
      bn: "৫. Interest ও Match ব্যবস্থাপনা",
    },
    body: {
      en: "Track everything from your Interests page — who you've sent Interests to and who has shown interest in you. When someone accepts your Interest (or you accept theirs), you become a match and can start talking inside MatchMedia.",
      bn: "Interests পেজ থেকে সবকিছু track করুন — আপনি কাকে Interest পাঠিয়েছেন এবং কে আপনাকে আগ্রহ দেখিয়েছে। কেউ আপনার Interest accept করলে (বা আপনি করলে) আপনারা match হয়ে যাবেন এবং MatchMedia-র ভেতরেই কথা বলা শুরু করতে পারবেন।",
    },
  },
  {
    id: 6,
    videoId: PLACEHOLDER_VIDEO_ID,
    title: { en: "6. How to Earn", bn: "৬. কীভাবে আয় করবেন" },
    body: {
      en: "Registered agents can earn by completing verification tasks for the platform — reviewing and confirming member details, then getting paid per completed task from the verification budget set on each request.",
      bn: "Registered agent-রা platform-এর verification task সম্পন্ন করে আয় করতে পারেন — সদস্যের তথ্য যাচাই ও নিশ্চিত করে, প্রতিটি সম্পন্ন task-এর জন্য request-এ নির্ধারিত verification budget থেকে payment পাবেন।",
    },
  },
  {
    id: 7,
    videoId: PLACEHOLDER_VIDEO_ID,
    title: {
      en: "7. Understanding Profile Types",
      bn: "৭. প্রোফাইলের ধরন বুঝুন",
    },
    body: {
      en: "MatchMedia supports four profile types, each with a different role on the platform:",
      bn: "MatchMedia-তে চার ধরনের প্রোফাইল আছে, প্রতিটির ভূমিকা আলাদা:",
    },
    // Unique placeholder video per profile type — replace with the real
    // walkthroughs once produced.
    subItems: [
      {
        videoId: "M7lc1UVf-VE",
        title: {
          en: "General Profile (Candidate)",
          bn: "General Profile (Candidate)",
        },
        description: {
          en: "The person looking for a life partner. Creates their own profile, browses, sends Interests, chats and calls.",
          bn: "যিনি নিজে জীবনসঙ্গী খুঁজছেন। নিজের প্রোফাইল তৈরি করেন, browse করেন, Interest পাঠান, chat ও call করেন।",
        },
      },
      {
        videoId: "ysz5S6PUM-U",
        title: { en: "Parents", bn: "Parents (অভিভাবক)" },
        description: {
          en: "Family members who manage a profile on behalf of a son or daughter, a common and respected practice in Bangladesh.",
          bn: "ছেলে বা মেয়ের পক্ষে প্রোফাইল পরিচালনা করেন এমন পরিবারের সদস্য, যা বাংলাদেশে প্রচলিত ও সম্মানিত রীতি।",
        },
      },
      {
        videoId: "aqz-KE-bpKQ",
        title: { en: "Media", bn: "Media (ঘটক প্রতিষ্ঠান)" },
        description: {
          en: "Matchmaking organizations that professionally manage multiple candidate profiles.",
          bn: "Matchmaking প্রতিষ্ঠান, যারা পেশাদারভাবে একাধিক candidate-এর প্রোফাইল পরিচালনা করে।",
        },
      },
      {
        videoId: "jNQXAC9IVRw",
        title: { en: "Agent", bn: "Agent (এজেন্ট)" },
        description: {
          en: "Verified field agents who complete verification tasks for the platform and earn from the verification budget.",
          bn: "Verified field agent, যারা platform-এর verification task সম্পন্ন করেন এবং verification budget থেকে আয় করেন।",
        },
      },
    ],
  },
  {
    id: 8,
    videoId: PLACEHOLDER_VIDEO_ID,
    title: { en: "8. Messaging and Call", bn: "৮. Messaging ও Call" },
    body: {
      en: "Once matched, all communication happens safely inside MatchMedia — phone numbers and emails are never shared:",
      bn: "Match হওয়ার পর সব যোগাযোগ MatchMedia-র ভেতরেই নিরাপদে হয় — ফোন নম্বর বা email কখনো share করা হয় না:",
    },
    points: [
      {
        en: "In-app messaging — chat one-to-one with your match directly in the app; new messages appear under Messages in the header.",
        bn: "In-app messaging — app-এর ভেতরেই match-এর সাথে one-to-one chat করুন; নতুন message header-এর Messages-এ দেখা যাবে।",
      },
      {
        en: "Voice & video calls — make free voice calls right inside the app (video calling is coming soon). Calls require a verified mobile number.",
        bn: "Voice ও video call — app-এর ভেতরেই ফ্রি voice call করুন (video call শীঘ্রই আসছে)। Call করতে verified মোবাইল নম্বর লাগবে।",
      },
      {
        en: "Safety advice — never share financial information or send money to anyone. Keep conversations inside MatchMedia, and report any suspicious profile — our moderation team reviews every report.",
        bn: "নিরাপত্তা পরামর্শ — আর্থিক তথ্য share করবেন না বা কাউকে টাকা পাঠাবেন না। কথোপকথন MatchMedia-র ভেতরেই রাখুন এবং সন্দেহজনক প্রোফাইল report করুন — আমাদের moderation team প্রতিটি report যাচাই করে।",
      },
    ],
  },
];

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
