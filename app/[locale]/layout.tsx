import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Inter, Hind_Siliguri } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/layout/Header";
import "../globals.css";

// Latin / numerals
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Bengali (Hind Siliguri is not a variable font — declare explicit weights)
const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-hind",
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

  // Default body font: Bengali (Hind Siliguri) for bn, Inter for en.
  const bodyFont = locale === "bn" ? "font-bengali" : "font-sans";

  return (
    <html lang={locale} className={`${inter.variable} ${hindSiliguri.variable}`}>
      <body className={`${bodyFont} bg-ivory text-charcoal antialiased`}>
        <NextIntlClientProvider>
          <Header />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
