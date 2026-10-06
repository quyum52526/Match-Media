import type { MetadataRoute } from "next";

// Private, signed-in, onboarding and admin areas. Rules match by prefix, so
// most are listed without a trailing slash to block the bare route (e.g.
// /dashboard) as well as everything under it. /profile/ keeps its slash so it
// does not also block the public /profiles/[id] pages. Each path is repeated
// under /en because English routes carry the locale prefix.
const privatePaths = [
  "/dashboard",
  "/messages",
  "/requests",
  "/admin",
  "/onboarding",
  "/subscription",
  "/interests",
  "/notifications",
  "/profile/",
  "/viewers",
  "/settings",
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
    sitemap: "https://www.matchmediabd.xyz/sitemap.xml",
    host: "https://www.matchmediabd.xyz",
  };
}
