"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { GENDERS, PROFESSIONS } from "@/lib/constants/profileOptions";
import { DISTRICTS } from "@/lib/constants/bdGeo";
import { localize } from "@/lib/constants/labels";
import { Search } from "lucide-react";

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
      className="mx-auto w-full rounded-card border border-hairline bg-surface p-2 font-body shadow-card transition-all duration-150 ease-in-out hover:shadow-md"
      role="search"
    >
      {/* Below md: 2x2 field grid with the button on its own full-width row.
          md+: four equal 1fr fields (grid-cols-4) plus an auto button cell. */}
      <div className="grid grid-cols-2 items-stretch gap-0 md:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
        {/* খুঁজছি — Looking for (maps to `gender`) */}
        <Field index={0} label={t("lookingFor")} value={gender} onChange={setGender}>
          <option value="">{t("any")}</option>
          {GENDERS.map((g) => (
            <option key={g.value} value={g.value}>
              {localize(g.value, locale)}
            </option>
          ))}
        </Field>

        {/* বয়স — Age (maps to minAge/maxAge) */}
        <Field index={1} label={t("age")} value={ageBand} onChange={setAgeBand}>
          <option value="">{t("anyAge")}</option>
          {AGE_BANDS.map((b) => (
            <option key={b.key} value={b.key}>
              {b.label}
            </option>
          ))}
        </Field>

        {/* জেলা — District (maps to `district`) */}
        <Field index={2} label={t("district")} value={district} onChange={setDistrict}>
          <option value="">{t("any")}</option>
          {DISTRICTS.map((d) => (
            <option key={d.value} value={d.value}>
              {localize(d.value, locale)}
            </option>
          ))}
        </Field>

        {/* পেশা — Profession (maps to `profession`) */}
        <Field index={3} label={t("profession")} value={profession} onChange={setProfession}>
          <option value="">{t("any")}</option>
          {PROFESSIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {localize(p.value, locale)}
            </option>
          ))}
        </Field>

        {/* Garnet pill submit — fixed height, centered in the bar's field row */}
        <div className="col-span-2 mt-2 flex items-center md:col-span-1 md:mt-0 md:pl-2">
          <button
            type="button"
            onClick={search}
            disabled={isPending}
            aria-label={t("search")}
            className="flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-pill bg-primary px-6 text-sm font-medium text-white shadow-card transition-all duration-150 ease-in-out hover:bg-primary-dark hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] disabled:opacity-70 md:w-auto"
          >
            <Search size={18} />
            {t("search")}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * One segment of the bar: a stacked label + borderless native <select>, both
 * left-aligned on the same px-5 gutter so their left edges line up exactly.
 * The chevron is anchored to the field (not the value row), so it stays on the
 * far right, vertically centered. `index` drives the separators only — a 1px
 * hairline at 60% height between fields on md+, a bottom border on the first
 * row below md — never before the first field or after the last.
 */
function Field({
  index,
  label,
  value,
  onChange,
  children,
}: {
  index: number;
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`group relative flex h-16 cursor-pointer flex-col justify-center rounded-card px-5 text-left transition-all duration-150 ease-in-out hover:bg-ink/[0.03] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40 ${
        // md+: vertical hairline on the left of every field but the first.
        index > 0
          ? "md:before:absolute md:before:left-0 md:before:top-1/2 md:before:h-[60%] md:before:w-px md:before:-translate-y-1/2 md:before:bg-hairline md:before:content-['']"
          : ""
      } ${
        // below md the 2x2 grid separates rows with a bottom border instead.
        index < 2 ? "border-b border-hairline md:border-b-0" : ""
      }`}
    >
      <span className="block truncate text-xs font-medium text-muted transition-colors duration-150 ease-in-out group-focus-within:text-primary">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className={`mt-0.5 w-full cursor-pointer appearance-none truncate bg-transparent pl-0 pr-7 text-left text-sm font-medium outline-none ${
          value === "" ? "text-muted" : "text-ink"
        }`}
      >
        {children}
      </select>
      {/* Chevron — far right of the field, vertically centered */}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted transition-transform duration-150 ease-in-out group-focus-within:rotate-180"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </label>
  );
}
