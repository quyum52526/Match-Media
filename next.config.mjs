import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverActions: {
    // Default is 1 MB; profile photos can reach 5 MB before client compression.
    bodySizeLimit: "5mb",
  },
  images: {
    remotePatterns: [
      {
        // Supabase Storage signed URLs: https://<project>.supabase.co/storage/…
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/sign/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
