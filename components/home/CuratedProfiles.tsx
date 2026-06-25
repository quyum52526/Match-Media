import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  CrownIcon,
  ShieldCheckIcon,
  SparklesIcon,
  FlameIcon,
  LockIcon,
  MapPinIcon,
} from "@/components/ui/icons";
import { Reveal } from "./Reveal";

/**
 * "Curated for you" — a clutter-free single row of exactly four profile cards
 * (grid-cols-1 md:grid-cols-4), each flagged with a distinct badge: Pro,
 * Verified, New Joiner, and High Interest. Sharp surface cards, hairline
 * borders, minimal shadow, elegant hover lift; cards cascade in on scroll.
 * Mock data — placeholder showcase.
 */

type BadgeKey = "pro" | "verified" | "new" | "popular";

interface CuratedCard {
  id: string;
  name: string;
  age: number;
  profession: string;
  district: string;
  badge: BadgeKey;
  hue: string;
}

const CARDS: ReadonlyArray<CuratedCard> = [
  { id: "c1", name: "Nusrat", age: 27, profession: "Doctor", district: "Dhaka", badge: "pro", hue: "from-amber-200 to-rose-100" },
  { id: "c2", name: "Tanvir", age: 31, profession: "Engineer", district: "Chattogram", badge: "verified", hue: "from-emerald-200 to-teal-100" },
  { id: "c3", name: "Maliha", age: 24, profession: "Lecturer", district: "Sylhet", badge: "new", hue: "from-sky-200 to-indigo-100" },
  { id: "c4", name: "Sabbir", age: 29, profession: "Architect", district: "Rajshahi", badge: "popular", hue: "from-rose-200 to-fuchsia-100" },
];

export async function CuratedProfiles() {
  const t = await getTranslations("Home.curated");

  const badgeFor: Record<
    BadgeKey,
    { label: string; className: string; Icon: typeof CrownIcon }
  > = {
    pro: { label: t("badges.pro"), className: "bg-accent text-white", Icon: CrownIcon },
    verified: { label: t("badges.verified"), className: "bg-success text-white", Icon: ShieldCheckIcon },
    new: { label: t("badges.new"), className: "border border-primary/30 bg-primary/5 text-primary", Icon: SparklesIcon },
    popular: { label: t("badges.popular"), className: "bg-primary text-white", Icon: FlameIcon },
  };

  return (
    <section className="bg-canvas antialiased">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
            {t("title")}
          </h2>
          <p className="mt-3 text-base font-normal text-muted">{t("subtitle")}</p>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-4">
          {CARDS.map((card, i) => {
            const badge = badgeFor[card.badge];
            return (
              <Reveal key={card.id} delay={i * 90}>
                <Link href="/profiles/demo" className="group block">
                  <article className="overflow-hidden rounded-card border border-hairline bg-surface shadow-card transition-all duration-200 ease-out group-hover:-translate-y-1 group-hover:shadow-md">
                    {/* Privacy-default photo area */}
                    <div className={`relative aspect-[5/6] overflow-hidden bg-gradient-to-br ${card.hue}`}>
                      <div className="absolute inset-0 bg-white/10 backdrop-blur-[6px]" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-ink/70">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/50 shadow-sm">
                          <LockIcon width={16} height={16} />
                        </span>
                        <span className="text-[10px] font-medium">{t("photoPrivate")}</span>
                      </div>
                      {/* Distinct badge */}
                      <span
                        className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-medium shadow-sm ${badge.className}`}
                      >
                        <badge.Icon width={11} height={11} />
                        {badge.label}
                      </span>
                    </div>

                    {/* Identity */}
                    <div className="space-y-1 p-3.5">
                      <p className="truncate text-sm font-medium text-ink">
                        {card.name}
                        {", "}
                        <span className="font-normal text-muted">{card.age}</span>
                      </p>
                      <p className="truncate text-xs text-muted">{card.profession}</p>
                      <p className="flex items-center gap-1 text-xs text-muted/80">
                        <MapPinIcon width={12} height={12} />
                        {card.district}
                      </p>
                    </div>
                  </article>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
