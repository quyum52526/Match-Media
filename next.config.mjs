import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Default is 1 MB; raise to 5 MB for logo + trade-license uploads.
      bodySizeLimit: "5mb",
    },
  },
  images: {
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
