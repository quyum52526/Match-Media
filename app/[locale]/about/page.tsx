import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EyeOff, MapPin, PhoneOff, ShieldCheck, Users } from "lucide-react";
import { GlowCard } from "@/components/ui/GlowCard";
import { Container } from "@/components/ui/Container";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    // Absolute: these titles already carry the brand, so skip the layout template.
    title: {
      absolute:
        locale === "bn"
          ? "আমাদের সম্পর্কে | নিরাপদ ও আধুনিক ম্যাট্রিমোনিয়াল | Match Media"
          : "About Match Media | Privacy-First Matrimonial Platform",
    },
    description:
      locale === "bn"
        ? "জানুন কীভাবে ম্যাচ মিডিয়া সার্ভার-সাইড ব্লার, জিরো কনটাক্ট রিভিল এবং ভেরিফাইড প্রোফাইলের মাধ্যমে বাংলাদেশে নিরাপদ জীবনসঙ্গী খোঁজার ব্যবস্থা নিশ্চিত করে।"
        : "Learn how Match Media protects biodata privacy in Bangladesh with server-side photo blur, zero contact reveal, and verified profiles.",
  };
}

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Match Media",
  url: "https://www.matchmediabd.xyz",
  logo: "https://www.matchmediabd.xyz/match-media-logo-maine.png",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Nasirabad, Chattogram",
    addressCountry: "BD",
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+8801962434901",
    contactType: "customer service",
  },
};

// One icon per pillar, in the same order as About.values in messages.
const pillarIcons = [EyeOff, PhoneOff, ShieldCheck, Users];

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("About");
  const intro = t.raw("intro") as string[];
  const missionBody = t.raw("missionBody") as string[];
  const values = t.raw("values") as { title: string; body: string }[];

  return (
    <Container className="py-10 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
          {t("title")}
        </h1>
        <div className="mt-4 space-y-3 text-base leading-relaxed text-ink/70">
          {intro.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <div className="mt-10">
          <GlowCard enableTilt={false} className="p-5 sm:p-8">
            <h2 className="font-display text-xl font-semibold text-ink">
              {t("missionTitle")}
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink/70 sm:text-base">
              {missionBody.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </GlowCard>
        </div>

        <h2 className="mt-12 font-display text-xl font-semibold text-ink">
          {t("valuesTitle")}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {values.map((value, index) => {
            const Icon = pillarIcons[index] ?? ShieldCheck;
            return (
              <GlowCard
                key={value.title}
                enableTilt={false}
                className="p-5 sm:p-6"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-ink">
                  {value.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink/70">
                  {value.body}
                </p>
              </GlowCard>
            );
          })}
        </div>

        <div className="mt-12 flex flex-col gap-4 rounded-card border border-primary/15 bg-primary/5 p-6 sm:flex-row sm:p-8">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
            <MapPin className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">
              {t("accountabilityTitle")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/70 sm:text-base">
              {t("accountabilityBody")}
            </p>
          </div>
        </div>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </Container>
  );
}
