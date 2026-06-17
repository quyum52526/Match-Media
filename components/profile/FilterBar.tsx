"use client";

import { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardBody } from "@/components/ui/Card";
import { GENDERS } from "@/lib/constants/profileOptions";
import { DISTRICTS } from "@/lib/constants/bdGeo";
import { PROFESSIONS, EDUCATION_LEVELS } from "@/lib/constants/profileOptions";
import { localize } from "@/lib/constants/labels";

const fieldClass =
  "h-10 w-full rounded-xl border border-charcoal/15 bg-white px-3 text-sm text-charcoal outline-none focus:border-trustGreen focus:ring-2 focus:ring-trustGreen/30";

export function FilterBar() {
  const t = useTranslations("Browse.filters");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const hasAny = ["gender", "minAge", "maxAge", "district", "profession", "education"].some(
    (k) => params.get(k),
  );

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function clearAll() {
    startTransition(() => router.replace(pathname, { scroll: false }));
  }

  return (
    <Card className={isPending ? "opacity-70 transition-opacity" : undefined}>
      <CardBody className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-charcoal">
            {t("heading")}
          </span>
          {hasAny && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs font-medium text-trustGreen hover:underline"
            >
              {t("clear")}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Gender */}
          <Labelled label={t("gender")}>
            <select
              value={params.get("gender") ?? ""}
              onChange={(e) => setParam("gender", e.target.value)}
              className={fieldClass}
            >
              <option value="">{t("any")}</option>
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>
                  {localize(g.value, locale)}
                </option>
              ))}
            </select>
          </Labelled>

          {/* Age range */}
          <Labelled label={t("ageRange")}>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={18}
                max={100}
                placeholder={t("minAge")}
                defaultValue={params.get("minAge") ?? ""}
                onChange={(e) => setParam("minAge", e.target.value)}
                className={`${fieldClass} font-sans`}
              />
              <span className="text-charcoal/40">–</span>
              <input
                type="number"
                inputMode="numeric"
                min={18}
                max={100}
                placeholder={t("maxAge")}
                defaultValue={params.get("maxAge") ?? ""}
                onChange={(e) => setParam("maxAge", e.target.value)}
                className={`${fieldClass} font-sans`}
              />
            </div>
          </Labelled>

          {/* District */}
          <Labelled label={t("district")}>
            <select
              value={params.get("district") ?? ""}
              onChange={(e) => setParam("district", e.target.value)}
              className={fieldClass}
            >
              <option value="">{t("any")}</option>
              {DISTRICTS.map((d) => (
                <option key={d.value} value={d.value}>
                  {localize(d.value, locale)}
                </option>
              ))}
            </select>
          </Labelled>

          {/* Profession */}
          <Labelled label={t("profession")}>
            <select
              value={params.get("profession") ?? ""}
              onChange={(e) => setParam("profession", e.target.value)}
              className={fieldClass}
            >
              <option value="">{t("any")}</option>
              {PROFESSIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {localize(p.value, locale)}
                </option>
              ))}
            </select>
          </Labelled>

          {/* Education */}
          <Labelled label={t("education")}>
            <select
              value={params.get("education") ?? ""}
              onChange={(e) => setParam("education", e.target.value)}
              className={fieldClass}
            >
              <option value="">{t("any")}</option>
              {EDUCATION_LEVELS.map((edu) => (
                <option key={edu.value} value={edu.value}>
                  {localize(edu.value, locale)}
                </option>
              ))}
            </select>
          </Labelled>
        </div>
      </CardBody>
    </Card>
  );
}

function Labelled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-charcoal/60">{label}</label>
      {children}
    </div>
  );
}
