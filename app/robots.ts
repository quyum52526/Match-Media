import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

// Private, signed-in, member-only, onboarding and admin areas. Rules match by
// prefix, so each entry also blocks everything beneath it. Note "/profile"
// covers both the owner's /profile/* pages and the member /profiles/[id]
// pages, and "/pro" covers /pro/checkout + /pro/pay. Each path is repeated
// under /en because English routes carry the locale prefix.
//
// Everything not listed (home, about, contact, pricing, safety, terms,
// privacy, user-guide, events, blog/*) stays crawlable and is in the sitemap.
const privatePaths = [
  "/browse",
  "/profile",
  "/dashboard",
  "/messages",
  "/requests",
  "/interests",
  "/viewers",
  "/notifications",
  "/subscription",
  "/pro",
  "/jobs",
  "/agency",
  "/agent",
  "/onboarding",
  "/verify-email",
  "/verify-mobile",
  "/settings",
  "/admin",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        ...privatePaths,
        ...privatePaths.map((path) => `/en${path}`),
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
