/**
 * Type-safe schema.org JSON-LD builders. Render the result with
 * <JsonLd data={...} /> (components/seo/JsonLd.tsx).
 */
import {
  HREFLANG,
  SITE_NAME,
  SITE_URL,
  getAbsoluteUrl,
  getLocalizedUrl,
  type SeoLocale,
} from "./site";

const CONTEXT = "https://schema.org" as const;
const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const LOGO_URL = getAbsoluteUrl("/matchmedia-logo-home.svg");

/**
 * Official brand social profiles for Organization.sameAs. Add each profile's
 * canonical URL here once it exists; while empty, `sameAs` is omitted.
 */
export const SOCIAL_PROFILES: readonly string[] = [];

const BRAND_DESCRIPTION: Record<SeoLocale, string> = {
  bn: "Match Media বাংলাদেশের প্রাইভেসি-ফার্স্ট ম্যাট্রিমনি প্ল্যাটফর্ম — ছবি ঝাপসা থাকে, যোগাযোগ হয় সম্মতির ভিত্তিতে, আর প্রোফাইল যাচাই করা হয়।",
  en: "Match Media is Bangladesh's privacy-first matrimonial platform — photos stay blurred, contact is consent-based, and profiles are verified.",
};

type Thing<T extends string> = { "@context": typeof CONTEXT; "@type": T };

/** A reference to another node in the graph by its @id. */
type NodeRef = { "@id": string };

export interface OrganizationSchema extends Thing<"Organization"> {
  "@id": string;
  name: string;
  url: string;
  logo: string;
  description: string;
  foundingLocation: { "@type": "Place"; name: string };
  address: {
    "@type": "PostalAddress";
    addressLocality: string;
    addressCountry: string;
  };
  contactPoint: {
    "@type": "ContactPoint";
    telephone: string;
    contactType: string;
    availableLanguage: string[];
  };
  sameAs?: string[];
}

export interface WebSiteSchema extends Thing<"WebSite"> {
  "@id": string;
  name: string;
  url: string;
  inLanguage: string[];
  publisher: NodeRef;
}

export interface ListItem {
  "@type": "ListItem";
  /** 1-indexed. */
  position: number;
  name: string;
  /** Absolute URL. */
  item: string;
}

export interface BreadcrumbListSchema extends Thing<"BreadcrumbList"> {
  itemListElement: ListItem[];
}

export interface FAQQuestion {
  "@type": "Question";
  name: string;
  acceptedAnswer: { "@type": "Answer"; text: string };
}

export interface FAQPageSchema extends Thing<"FAQPage"> {
  inLanguage?: string;
  mainEntity: FAQQuestion[];
}

export interface ArticleSchema extends Thing<"BlogPosting"> {
  headline: string;
  description: string;
  image: string[];
  datePublished: string;
  dateModified: string;
  inLanguage: string;
  author: { "@type": "Person" | "Organization"; name: string; url?: string };
  publisher: NodeRef & {
    "@type": "Organization";
    name: string;
    logo: { "@type": "ImageObject"; url: string };
  };
  mainEntityOfPage: { "@type": "WebPage"; "@id": string };
  keywords?: string;
  /** ISO 8601 duration, e.g. "PT3M". */
  timeRequired?: string;
}

export type JsonLdSchema =
  | OrganizationSchema
  | WebSiteSchema
  | BreadcrumbListSchema
  | FAQPageSchema
  | ArticleSchema;

/** a) Organization — homepage + About. Stable @id lets other nodes reference it. */
export function organizationSchema(
  locale: SeoLocale = "bn",
): OrganizationSchema {
  return {
    "@context": CONTEXT,
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: LOGO_URL,
    description: BRAND_DESCRIPTION[locale],
    foundingLocation: { "@type": "Place", name: "Bangladesh" },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Nasirabad, Chattogram",
      addressCountry: "BD",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+8801962434901",
      contactType: "customer service",
      availableLanguage: ["Bengali", "English"],
    },
    ...(SOCIAL_PROFILES.length ? { sameAs: [...SOCIAL_PROFILES] } : {}),
  };
}

/**
 * a) WebSite — homepage. No SearchAction: /browse is private (robots-disallowed),
 * so advertising a sitelinks search box would point Google at a blocked URL.
 */
export function websiteSchema(): WebSiteSchema {
  return {
    "@context": CONTEXT,
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: ["bn-BD", "en-US"],
    publisher: { "@id": ORG_ID },
  };
}

/**
 * b) BreadcrumbList — internal pages. `path`s are unprefixed app paths; they
 * are localized + made absolute here. The home crumb is prepended automatically.
 */
export function breadcrumbSchema(
  locale: SeoLocale,
  crumbs: { name: string; path: string }[],
  homeName = locale === "bn" ? "হোম" : "Home",
): BreadcrumbListSchema {
  const all = [{ name: homeName, path: "/" }, ...crumbs];
  return {
    "@context": CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: all.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: getLocalizedUrl(locale, crumb.path),
    })),
  };
}

/**
 * c) FAQPage — FAQ/help pages. Each question and answer must be visible on
 * the page (collapsed accordions are fine); pass plain text, not HTML.
 * Empty pairs are dropped so a missing translation can't emit blank nodes.
 */
export function faqPageSchema(
  faqs: { question: string; answer: string }[],
  locale?: SeoLocale,
): FAQPageSchema {
  return {
    "@context": CONTEXT,
    "@type": "FAQPage",
    ...(locale ? { inLanguage: HREFLANG[locale] } : {}),
    mainEntity: faqs
      .filter(({ question, answer }) => question.trim() && answer.trim())
      .map(({ question, answer }) => ({
        "@type": "Question",
        name: question.trim(),
        acceptedAnswer: { "@type": "Answer", text: answer.trim() },
      })),
  };
}

/**
 * Blog article (BlogPosting is the Article subtype Google expects for blogs).
 * Bylines that name the brand (e.g. "Match Media Editorial") are typed as an
 * Organization; anything else as a Person. Publisher references the
 * Organization node by @id.
 */
export function articleSchema(input: {
  locale: SeoLocale;
  url: string;
  headline: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified?: string;
  author?: string;
  keywords?: string[];
  /** Estimated reading time in whole minutes. */
  readingMinutes?: number;
}): ArticleSchema {
  const published = new Date(
    `${input.datePublished}T00:00:00.000Z`,
  ).toISOString();
  const modified = input.dateModified
    ? new Date(`${input.dateModified}T00:00:00.000Z`).toISOString()
    : published;
  const author = input.author?.trim() || SITE_NAME;
  return {
    "@context": CONTEXT,
    "@type": "BlogPosting",
    headline: input.headline,
    description: input.description,
    image: [getAbsoluteUrl(input.image)],
    datePublished: published,
    dateModified: modified,
    inLanguage: HREFLANG[input.locale],
    author: author.startsWith(SITE_NAME)
      ? { "@type": "Organization", name: author, url: SITE_URL }
      : { "@type": "Person", name: author },
    publisher: {
      "@id": ORG_ID,
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: LOGO_URL },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": input.url },
    ...(input.keywords?.length ? { keywords: input.keywords.join(", ") } : {}),
    ...(input.readingMinutes
      ? { timeRequired: `PT${input.readingMinutes}M` }
      : {}),
  };
}
