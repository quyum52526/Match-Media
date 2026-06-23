"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { GENDERS, PROFESSIONS } from "@/lib/constants/profileOptions";
import { DISTRICTS } from "@/lib/constants/bdGeo";
import { localize } from "@/lib/constants/labels";
import { SearchIcon } from "@/components/ui/icons";

/**
 * Homepage Quick-Filter — Brand v1.0. An Airbnb-style segmented search bar on a
 * white surface with a hairline border + 14px radius, and a Garnet pill submit
 * (hover → Garnet Dark + 0.98 scale). The four fields map straight onto the
 * /browse query params, so submitting routes there with filters pre-applied.
 * Tailwind built-in transitions only.
 */

// Age presented as friendly bands; numerals are identical in both locales.
const AGE_BANDS: ReadonlyArray<{ key: string; min: string; max: string; label: string }> = [
  { key: "18-25", min: "18", max: "25", label: "18–25" },
  { key: "26-30", min: "26", max: "30", label: "26–30" },
  { key: "31-35", min: "31", max: "35", label: "31–35" },
  { key: "36-40", min: "36", max: "40", label: "36–40" },
  { key: "41+", min: "41", max: "", label: "41+" },
];

export function QuickFilter() {
  const t = useTranslations("Home.quickFilter");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [gender, setGender] = useState("");
  const [ageBand, setAgeBand] = useState("");
  const [district, setDistrict] = useState("");
  const [profession, setProfession] = useState("");

  function search() {
    const qs = new URLSearchParams();
    if (gender) qs.set("gender", gender);
    if (ageBand) {
      const band = AGE_BANDS.find((b) => b.key === ageBand);
      if (band?.min) qs.set("minAge", band.min);
      if (band?.max) qs.set("maxAge", band.max);
    }
    if (district) qs.set("district", district);
    if (profession) qs.set("profession", profession);
    const q = qs.toString();
    startTransition(() => router.push(q ? `/browse?${q}` : "/browse"));
  }

  return (
    <div
      className="mx-auto w-full max-w-3xl rounded-card border border-hairline bg-surface p-2 font-body shadow-card transition-all duration-150 ease-in-out hover:shadow-md"
      role="search"
    >
      <div className="flex flex-col gap-1 md:flex-row md:items-stretch md:gap-0 md:divide-x md:divide-hairline">
        {/* খুঁজছি — Looking for (maps to `gender`) */}
        <Field label={t("lookingFor")} value={gender} onChange={setGender}>
          <option value="">{t("any")}</option>
          {GENDERS.map((g) => (
            <option key={g.value} value={g.value}>
              {localize(g.value, locale)}
            </option>
          ))}
        </Field>

        {/* বয়স — Age (maps to minAge/maxAge) */}
        <Field label={t("age")} value={ageBand} onChange={setAgeBand}>
          <option value="">{t("anyAge")}</option>
          {AGE_BANDS.map((b) => (
            <option key={b.key} value={b.key}>
              {b.label}
            </option>
          ))}
        </Field>

        {/* জেলা — District (maps to `district`) */}
        <Field label={t("district")} value={district} onChange={setDistrict}>
          <option value="">{t("any")}</option>
          {DISTRICTS.map((d) => (
            <option key={d.value} value={d.value}>
              {localize(d.value, locale)}
            </option>
          ))}
        </Field>

        {/* পেশা — Profession (maps to `profession`) */}
        <Field label={t("profession")} value={profession} onChange={setProfession}>
          <option value="">{t("any")}</option>
          {PROFESSIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {localize(p.value, locale)}
            </option>
          ))}
        </Field>

        {/* Garnet pill submit */}
        <div className="flex items-center md:pl-2">
          <button
            type="button"
            onClick={search}
            disabled={isPending}
            aria-label={t("search")}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-primary px-6 text-sm font-medium text-white shadow-card transition-all duration-150 ease-in-out hover:bg-primary-dark hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] disabled:opacity-70 md:w-auto"
          >
            <SearchIcon width={18} height={18} />
            {t("search")}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * One segment of the bar: a label + a borderless native <select> with a custom
 * chevron. Hover gives a subtle, fast wash; focus tints the label Garnet.
 */
function Field({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="group relative flex-1 cursor-pointer rounded-card px-4 py-2 transition-all duration-150 ease-in-out hover:bg-ink/[0.03]">
      <span className="block text-xs font-medium text-muted transition-colors duration-150 ease-in-out group-focus-within:text-primary">
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className={`w-full cursor-pointer appearance-none truncate bg-transparent pr-6 text-sm font-medium outline-none ${
            value === "" ? "text-muted" : "text-ink"
          }`}
        >
          {children}
        </select>
        {/* Chevron */}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted transition-transform duration-150 ease-in-out group-focus-within:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </label>
  );
}
