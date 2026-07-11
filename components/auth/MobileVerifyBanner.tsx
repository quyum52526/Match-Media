import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { getViewerId } from "@/lib/session";
import { ShieldCheckIcon } from "@/components/ui/icons";

/**
 * A slim app-wide nudge to verify the user's mobile. Renders nothing for signed-
 * out or already-verified users. Mounted once in the locale layout.
 */
export async function MobileVerifyBanner() {
  const viewerId = await getViewerId();
  if (!viewerId) return null;

  const user = await prisma.user.findUnique({
    where: { id: viewerId },
    select: { isMobileVerified: true },
  });
  if (!user || user.isMobileVerified) return null;

  const t = await getTranslations("VerifyMobile.banner");

  return (
    <div className="border-b border-amber-300/40 bg-amber-50">
      {/* max-w-6xl matches the Header/Container rail so edges line up. */}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2">
        <div className="flex items-center gap-2 text-sm text-amber-900">
          <ShieldCheckIcon width={18} height={18} className="shrink-0" />
          <span>{t("message")}</span>
        </div>
        <Link
          href="/verify-mobile"
          className="shrink-0 rounded-lg bg-amber-900 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-amber-800"
        >
          {t("cta")}
        </Link>
      </div>
    </div>
  );
}
