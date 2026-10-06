/**
 * User Guide content (bilingual). Kept out of the "use client" component so
 * server code — e.g. the FAQPage JSON-LD on /user-guide — can read the same
 * data the page renders.
 */
export type GuideLang = "en" | "bn";

export interface Localized {
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
export const PLACEHOLDER_VIDEO_ID = "M7lc1UVf-VE";

export const UI_TEXT: Record<string, Localized> = {
  heading: { en: "User Guide", bn: "ব্যবহার নির্দেশিকা" },
  intro: {
    en: "New to Match Media? Here's how to get started in a few simple steps.",
    bn: "Match Media-তে নতুন? কয়েকটি সহজ ধাপে শুরু করুন।",
  },
  watchVideo: { en: "Watch Video", bn: "ভিডিও দেখুন" },
};

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 1,
    videoId: "I7b7Scwg8Ws",
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
      en: 'Verification keeps the community safe and unlocks messaging and calling with your matches. Complete these checks — profiles with the "Verified" and "Premium Verified" badges get far more responses:',
      bn: 'Verification community-কে নিরাপদ রাখে এবং match-দের সাথে messaging ও calling চালু করে। এই ধাপগুলো সম্পন্ন করুন — "Verified" ও "Premium Verified" badge-সহ প্রোফাইল অনেক বেশি সাড়া পায়:',
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
          en: 'Submit your National ID so our agents can confirm your identity and location — this is what earns the "Verified" badge on your profile.',
          bn: 'National ID জমা দিন যাতে আমাদের agent-রা আপনার পরিচয় ও অবস্থান নিশ্চিত করতে পারেন — এটিই আপনার প্রোফাইলে "Verified" badge এনে দেয়।',
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
    videoId: "5Eoi7RAmJCY",
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
      en: "Track everything from your Interests page — who you've sent Interests to and who has shown interest in you. When someone accepts your Interest (or you accept theirs), you become a match and can start talking inside Match Media.",
      bn: "Interests পেজ থেকে সবকিছু track করুন — আপনি কাকে Interest পাঠিয়েছেন এবং কে আপনাকে আগ্রহ দেখিয়েছে। কেউ আপনার Interest accept করলে (বা আপনি করলে) আপনারা match হয়ে যাবেন এবং Match Media-র ভেতরেই কথা বলা শুরু করতে পারবেন।",
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
      en: "Match Media supports four profile types, each with a different role on the platform:",
      bn: "Match Media-তে চার ধরনের প্রোফাইল আছে, প্রতিটির ভূমিকা আলাদা:",
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
      en: "Once matched, communicate safely inside Match Media. Your contact details are never shared without your mutual consent:",
      bn: "Match হওয়ার পর Match Media-র ভেতরে নিরাপদে যোগাযোগ করুন। উভয়ের সম্মতি ছাড়া আপনার যোগাযোগের তথ্য শেয়ার করা হয় না:",
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
        en: "Safety advice — never share financial information or send money to anyone. Keep conversations inside Match Media, and report any suspicious profile — our moderation team reviews every report.",
        bn: "নিরাপত্তা পরামর্শ — আর্থিক তথ্য share করবেন না বা কাউকে টাকা পাঠাবেন না। কথোপকথন Match Media-র ভেতরেই রাখুন এবং সন্দেহজনক প্রোফাইল report করুন — আমাদের moderation team প্রতিটি report যাচাই করে।",
      },
    ],
  },
];

/**
 * The guide as question/answer pairs for FAQPage JSON-LD. Every string here is
 * rendered in the guide's accordion: the section title is the question
 * (numbering stripped) and the body, bullet points and sub-items form the answer.
 */
export function guideFaqs(
  lang: GuideLang,
): { question: string; answer: string }[] {
  return GUIDE_SECTIONS.map((section) => {
    const parts = [section.body[lang]];
    for (const point of section.points ?? []) parts.push(point[lang]);
    for (const item of section.subItems ?? []) {
      parts.push(`${item.title[lang]}: ${item.description[lang]}`);
      if (item.note) parts.push(item.note[lang]);
    }
    return {
      question: section.title[lang].replace(/^[\d০-৯]+\.\s*/, ""),
      answer: parts.join(" "),
    };
  });
}
