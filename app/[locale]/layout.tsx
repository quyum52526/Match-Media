import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Hind_Siliguri,
  Fraunces,
  Plus_Jakarta_Sans,
  Noto_Serif_Bengali,
} from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  DEFAULT_OG_IMAGE,
  OG_LOCALE,
  SITE_NAME,
  SITE_URL,
  toSeoLocale,
} from "@/lib/seo/site";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileVerifyBanner } from "@/components/auth/MobileVerifyBanner";
import { CallProviderMount } from "@/components/calls/CallProviderMount";
import { GuestModeProvider } from "@/components/auth/GuestModeContext";
import { getViewerId } from "@/lib/session";
import { isGuestSession } from "@/lib/guest";
import "../globals.css";

// Bengali body (Hind Siliguri is not a variable font — declare explicit weights)
const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-hind",
  display: "swap",
});

// --- Brand v1.0 fonts ---
// Headings (EN): Fraunces — an elegant serif for the premium, respectful tone.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

// Body (EN): Plus Jakarta Sans.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

// Headings (BN): Noto Serif Bengali — the serif pairing for Bengali display text.
const notoSerifBengali = Noto_Serif_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-bengali",
  display: "swap",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = toSeoLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Seo.home" });
  const title = t("title");
  const description = t("description");

  // Site-wide fallbacks. Public pages override title/description/canonical/
  // hreflang/openGraph via lib/seo/metadata.ts; private pages inherit these.
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s | ${SITE_NAME}` },
    description,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      locale: OG_LOCALE[locale],
      images: [
        { url: DEFAULT_OG_IMAGE, width: 2848, height: 1504, alt: title },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
    // Brand favicon (MM monogram, scalable SVG). shortcut/apple aliases cover
    // legacy favicon lookups and iOS home-screen; SVG scales to any size.
    icons: {
      icon: [{ url: "/matchmedia-favicon.svg", type: "image/svg+xml" }],
      shortcut: "/matchmedia-favicon.svg",
      apple: "/matchmedia-favicon.svg",
    },
  };
}

// NOTE: We intentionally do NOT export generateStaticParams. Pre-enumerating
// the locale forced Next to prerender every [locale] page at build — which is
// wrong for auth-gated, viewer-scoped routes (they must run per request so
// cookies/session are read). Without it, pages render on demand (dynamic).

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Enable static rendering for this locale.
  setRequestLocale(locale);

  // Brand v1.0 body font (Plus Jakarta Sans → Hind Siliguri fallback for Bengali).
  const bodyFont = "font-body";

  // A real session always wins over a stale guest cookie.
  const hasSession = Boolean(await getViewerId());
  const isGuest = !hasSession && (await isGuestSession());

  return (
    <html
      lang={locale}
      className={`${hindSiliguri.variable} ${fraunces.variable} ${jakarta.variable} ${notoSerifBengali.variable}`}
    >
      <body className={`${bodyFont} bg-canvas text-ink antialiased`}>
        <NextIntlClientProvider>
          <GuestModeProvider isGuest={isGuest}>
            <CallProviderMount>
              <Header />
              <MobileVerifyBanner />
              {children}
              <Footer />
            </CallProviderMount>
          </GuestModeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
