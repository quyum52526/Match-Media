import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Hind_Siliguri,
  Fraunces,
  Plus_Jakarta_Sans,
  Noto_Serif_Bengali,
} from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/layout/Header";
import { MobileVerifyBanner } from "@/components/auth/MobileVerifyBanner";
import { CallProviderMount } from "@/components/calls/CallProviderMount";
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

export const metadata: Metadata = {
  title: "MatchMedia",
  description: "Privacy-first nationwide matrimonial platform.",
};

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

  return (
    <html
      lang={locale}
      className={`${hindSiliguri.variable} ${fraunces.variable} ${jakarta.variable} ${notoSerifBengali.variable}`}
    >
      <body className={`${bodyFont} bg-canvas text-ink antialiased`}>
        <NextIntlClientProvider>
          <CallProviderMount>
            <Header />
            <MobileVerifyBanner />
            {children}
          </CallProviderMount>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
