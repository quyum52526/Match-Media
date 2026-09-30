import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  FeatureFlagToggles,
  type FlagRow,
} from "@/components/admin/FeatureFlagToggles";
import { getFeatureFlags, FEATURE_FLAG_KEYS } from "@/lib/featureFlags";

export const metadata = {
  title: "Settings · Admin · MatchMedia",
};

/**
 * Admin feature-flag settings.
 *
 * The admin LAYOUT already enforces `requireAdmin()`, and `updateFeatureFlag`
 * re-checks `assertAdmin()` server-side, so reading the flags here needs no
 * additional gate — but the write path is never trusted to the page.
 */
export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin.settings");

  const flags = await getFeatureFlags();

  const rows: FlagRow[] = FEATURE_FLAG_KEYS.map((key) => {
    const enabled = flags[key];
    return {
      key,
      enabled,
      label: t(`flags.${key}.label`),
      description: t(`flags.${key}.description`),
      // Warnings appear only in the position that actually carries the risk.
      warning:
        key === "ENABLE_SMS_OTP" && !enabled
          ? t("warnings.smsOff")
          : key === "REQUIRE_VERIFICATION_TO_BROWSE" && enabled
            ? t("warnings.browseGateOn")
            : undefined,
      // Every flag now drives real behaviour, so nothing is marked inert. Keep
      // the mechanism: the next flag added ahead of its implementation should be
      // labelled rather than silently doing nothing.
      inert: false,
    };
  });

  return (
    <FeatureFlagToggles
      flags={rows}
      title={t("title")}
      intro={t("intro")}
      savedLabel={t("saved")}
      errorLabel={t("error")}
      inertLabel={t("inert")}
    />
  );
}
