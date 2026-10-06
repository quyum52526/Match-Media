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
const LOGO_URL = getAbsoluteUrl("/match-media-logo-maine.png");

type Thing<T extends string> = { "@context": typeof CONTEXT; "@type": T };

export interface OrganizationSchema extends Thing<"Organization"> {
  "@id": string;
  name: string;
  url: string;
  logo: string;
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
}

export interface WebSiteSchema extends Thing<"WebSite"> {
  "@id": string;
  name: string;
  url: string;
  inLanguage: string[];
  publisher: { "@id": string };
}

export interface BreadcrumbListSchema extends Thing<"BreadcrumbList"> {
  itemListElement: {
    "@type": "ListItem";
    position: number;
    name: string;
    item: string;
  }[];
}

export interface FAQPageSchema extends Thing<"FAQPage"> {
  inLanguage: string;
  mainEntity: {
    "@type": "Question";
    name: string;
    acceptedAnswer: { "@type": "Answer"; text: string };
  }[];
}

export interface ArticleSchema extends Thing<"BlogPosting"> {
  headline: string;
  description: string;
  image: string[];
  datePublished: string;
  dateModified: string;
  inLanguage: string;
  author: { "@type": "Person" | "Organization"; name: string };
  publisher: {
    "@id": string;
    "@type": "Organization";
    name: string;
    logo: { "@type": "ImageObject"; url: string };
  };
  mainEntityOfPage: { "@type": "WebPage"; "@id": string };
  keywords?: string;
}

export type JsonLdSchema =
  | OrganizationSchema
  | WebSiteSchema
  | BreadcrumbListSchema
  | FAQPageSchema
  | ArticleSchema;

/** a) Organization — homepage + About. Stable @id lets other nodes reference it. */
export function organizationSchema(): OrganizationSchema {
  return {
    "@context": CONTEXT,
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: LOGO_URL,
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
    inLanguage: [HREFLANG.bn, HREFLANG.en],
    publisher: { "@id": ORG_ID },
  };
}

/**
 * b) BreadcrumbList — internal pages. `path`s are unprefixed app paths; they
 * are localized here. The home crumb is prepended automatically.
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
 * c) FAQPage — FAQ/help pages. Answers must be visible on the page itself
 * (Google requirement); pass plain text, not HTML.
 */
export function faqPageSchema(
  locale: SeoLocale,
  faqs: { question: string; answer: string }[],
): FAQPageSchema {
  return {
    "@context": CONTEXT,
    "@type": "FAQPage",
    inLanguage: HREFLANG[locale],
    mainEntity: faqs.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
}

/** Blog article (BlogPosting is the Article subtype Google expects for blogs). */
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
}): ArticleSchema {
  const published = new Date(
    `${input.datePublished}T00:00:00.000Z`,
  ).toISOString();
  const modified = input.dateModified
    ? new Date(`${input.dateModified}T00:00:00.000Z`).toISOString()
    : published;
  return {
    "@context": CONTEXT,
    "@type": "BlogPosting",
    headline: input.headline,
    description: input.description,
    image: [getAbsoluteUrl(input.image)],
    datePublished: published,
    dateModified: modified,
    inLanguage: HREFLANG[input.locale],
    author: input.author
      ? { "@type": "Person", name: input.author }
      : { "@type": "Organization", name: SITE_NAME },
    publisher: {
      "@id": ORG_ID,
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: LOGO_URL },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": input.url },
    ...(input.keywords?.length ? { keywords: input.keywords.join(", ") } : {}),
  };
}
