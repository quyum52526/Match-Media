import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Default is 1 MB. Files are capped at 5 MB (lib/storage/images.ts), and
      // the multipart envelope adds a little on top, so allow 6 MB or a photo
      // right at the cap is rejected before validation can explain why.
      bodySizeLimit: "6mb",
    },
  },
  images: {
    // Hold an optimized derivative for at least 24h instead of the 60s default.
    //
    // Full benefit applies to stable URLs — the local /public brand art, and any
    // future public-bucket photo URL.
    //
    // CAVEAT for Supabase signed URLs: the optimizer keys its cache on the whole
    // source URL, query string included, so each hourly signature rotation
    // (SIGNED_URL_TTL in lib/storage/supabase.ts) is a fresh cache key and gets
    // re-optimized no matter how high this is set. Raising SIGNED_URL_TTL is
    // what actually cuts that re-work; this TTL cannot.
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        // Supabase Storage, every object route in one rule:
        //   /storage/v1/object/sign/…           signed URL (private bucket)
        //   /storage/v1/object/public/…         public-read bucket
        //   /storage/v1/object/authenticated/…  RLS-authenticated read
        //
        // One pattern rather than three: the previous pair listed sign and
        // public only, so adding a route (or the SDK changing which one it
        // mints) failed as an un-whitelisted host rather than as anything
        // legible. The host wildcard matches any Supabase project, so a staging
        // project needs no config change.
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
