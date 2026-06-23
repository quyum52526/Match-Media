import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { ProfileCompletion } from "@/lib/data/profileCompletion";

const MAX_CHIPS = 6;

/**
 * A nudge to finish the profile: progress bar + the fields still missing + a
 * CTA into the edit form. Renders nothing once the profile is 100% complete.
 */
export async function ProfileCompletionBanner({
  completion,
}: {
  completion: ProfileCompletion;
}) {
  if (completion.score >= 100) return null;

  const t = await getTranslations("ProfileCompletion");
  const f = await getTranslations("ProfileEdit.fields");

  const chips = completion.missing.slice(0, MAX_CHIPS);
  const more = completion.missing.length - chips.length;

  return (
    <Card className="border-primary/20 bg-primary/[0.04]">
      <CardBody className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-ink">{t("title")}</p>
            <p className="mt-0.5 text-xs text-ink/60">{t("subtitle")}</p>
          </div>
          <span className="font-body text-lg font-bold leading-none text-primary">
            {completion.score}%
          </span>
        </div>

        <div
          className="h-2 w-full overflow-hidden rounded-full bg-ink/10"
          role="progressbar"
          aria-valuenow={completion.score}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${completion.score}%` }}
          />
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-ink/50">{t("missingLabel")}</span>
            {chips.map((k) => (
              <span
                key={k}
                className="rounded-full bg-white px-2 py-0.5 text-xs text-ink/70 ring-1 ring-ink/10"
              >
                {f(k)}
              </span>
            ))}
            {more > 0 && (
              <span className="text-xs text-ink/50">
                {t("more", { n: String(more) })}
              </span>
            )}
          </div>
        )}

        <div>
          <Link href="/profile/edit">
            <Button size="sm">{t("cta")}</Button>
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
