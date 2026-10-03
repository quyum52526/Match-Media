"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { toggleFeaturedProfile } from "@/lib/actions/admin";

export function FeaturedProfileToggle({
  profileId,
  isFeatured,
}: {
  profileId: string;
  isFeatured: boolean;
}) {
  const t = useTranslations("Profile");
  const [featured, setFeatured] = useOptimistic(isFeatured);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  function toggle() {
    setError(false);
    startTransition(async () => {
      setFeatured(!featured);
      try {
        const result = await toggleFeaturedProfile(profileId);
        if (!result.ok) {
          setError(true);
          return;
        }
      } catch {
        setError(true);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={featured}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60 ${
          featured
            ? "border-amber-400 bg-amber-100 text-amber-800 shadow-sm"
            : "border-ink/20 bg-white text-ink hover:border-amber-400 hover:bg-amber-50 hover:text-amber-800"
        }`}
      >
        <Star
          size={17}
          aria-hidden="true"
          className={featured ? "fill-current" : undefined}
        />
        {featured ? t("featuredOnHome") : t("featureOnHome")}
      </button>
      {error && (
        <span role="alert" className="text-xs font-medium text-red-700">
          {t("featureToggleError")}
        </span>
      )}
    </div>
  );
}
