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
        // Supabase Storage signed URLs (private bucket):
        // https://<project>.supabase.co/storage/v1/object/sign/…
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/sign/**",
      },
      {
        // Supabase Storage public URLs (public-read fallback):
        // https://<project>.supabase.co/storage/v1/object/public/…
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
