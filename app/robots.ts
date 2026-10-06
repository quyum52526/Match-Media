import type { MetadataRoute } from "next";

// Private, signed-in areas. Listed without a trailing slash so the bare route
// (e.g. /dashboard) is blocked as well as everything under it; each one is
// repeated under /en because English routes carry the locale prefix.
const privatePaths = ["/dashboard", "/messages", "/requests"];

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
