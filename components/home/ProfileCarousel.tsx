import { getTranslations, getLocale } from "next-intl/server";
import { Lock, Star, Check, MapPin } from "lucide-react";
import { localize } from "@/lib/constants/labels";

/**
 * "Verified Professionals" — a horizontally-scrolling carousel of privacy-default
 * profile cards (pastel photo area + lock, badges, identity). `profession` and
 * `district` use canonical values so they localize in both locales.
 *
 * NOTE: renders a left-aligned header + the card track only (no full-width band /
 * bg / max-w / padding) — the parent container on the homepage owns bounds +
 * spacing. Mock data — placeholder showcase.
 */

interface Pro {
  id: string;
  name: string;
  age: number;
  profession: string; // canonical (matches PROFESSIONS)
  district: string; // canonical (matches DISTRICTS)
  bg: string; // soft pastel for the private-photo area
  premium: boolean;
  verified: boolean;
}

const PROS: ReadonlyArray<Pro> = [
  { id: "p1", name: "Ayesha", age: 30, profession: "Doctor", district: "Dhaka", bg: "#FFEBEF", premium: true, verified: true },
  { id: "p2", name: "Tanvir", age: 29, profession: "Engineer", district: "Chattogram", bg: "#E6F8F0", premium: false, verified: true },
  { id: "p3", name: "Imran", age: 33, profession: "IT/Software", district: "Dhaka", bg: "#E8F0FE", premium: true, verified: true },
  { id: "p4", name: "Nabila", age: 28, profession: "Banker", district: "Sylhet", bg: "#FFF5D1", premium: false, verified: true },
  { id: "p5", name: "Sadia", age: 31, profession: "Lawyer", district: "Khulna", bg: "#F4EBFF", premium: true, verified: true },
  { id: "p6", name: "Arif", age: 35, profession: "Government Service", district: "Rajshahi", bg: "#E6F8F0", premium: false, verified: true },
];

export async function ProfileCarousel() {
  const t = await getTranslations("Home.professionals");
  const locale = await getLocale();

  return (
    <section>
      {/* Header — strictly left-aligned */}
      <div className="mb-8 text-left">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {t("title")}
        </h2>
        <p className="mt-2 text-base font-normal text-muted">{t("subtitle")}</p>
      </div>

      {/* Carousel — starts from the left, scrollbar hidden */}
      <div className="scrollbar-hide flex w-full snap-x justify-start gap-6 overflow-x-auto py-4">
        {PROS.map((p) => (
          <article
            key={p.id}
            className="relative w-[260px] min-w-[260px] shrink-0 snap-start overflow-hidden rounded-2xl bg-white shadow-lg transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-xl"
          >
            {/* Top: private-photo area (pastel) */}
            <div
              className="relative flex h-[220px] flex-col items-center justify-center gap-2"
              style={{ backgroundColor: p.bg }}
            >
              <Lock size={26} strokeWidth={1.6} className="text-ink/55" />
              <span className="text-xs font-medium text-ink/60">
                {t("photoPrivate")}
              </span>

              {/* Badges */}
              {p.premium && (
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-pill bg-accent px-2 py-0.5 text-[10px] font-medium text-white shadow-sm">
                  <Star size={10} />
                  {t("premium")}
                </span>
              )}
              {p.verified && (
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-pill bg-success px-2 py-0.5 text-[10px] font-medium text-white shadow-sm">
                  <Check size={10} />
                  {t("mobileVerified")}
                </span>
              )}
            </div>

            {/* Bottom: details */}
            <div className="p-4">
              <p className="text-base font-semibold text-ink">{p.name}</p>
              <p className="mt-0.5 text-sm text-muted">
                <span className="font-body">{p.age}</span>
                {" · "}
                {localize(p.profession, locale)}
              </p>
              <p className="mt-1.5 flex items-center gap-1 text-xs text-muted/80">
                <MapPin size={12} />
                {localize(p.district, locale)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
