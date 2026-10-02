import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import {
  LockIcon,
  ClockIcon,
  CheckIcon,
  ShieldCheckIcon,
} from "@/components/ui/icons";
import { PrivacyBlur } from "@/components/privacy/PrivacyBlur";
import type { ImagePrivacy, ModerationStatus, PhotoAccessState } from "./types";

interface BlurredImageProps {
  privacy: ImagePrivacy;
  state: PhotoAccessState;
  /** Optional real image URL; when revealed it is shown, otherwise blurred. */
  src?: string;
  /** Display name, used to build the alt text. */
  name: string;
  onRequest?: () => void;
  pending?: boolean;
  /** Blocked by the free-tier daily request cap. */
  requestDisabled?: boolean;
  /**
   * ADMIN / SUPER_ADMIN viewer: the server already signed the original, so the
   * photo renders clear and the request flow is replaced by admin controls.
   */
  adminView?: boolean;
  /** Primary photo's moderation state (admin viewers only). */
  moderation?: ModerationStatus;
}

/** Has the viewer earned a clear look at the photo? */
function isRevealed(
  privacy: ImagePrivacy,
  state: PhotoAccessState,
  adminView: boolean,
): boolean {
  return adminView || privacy === "PUBLIC" || state === "APPROVED";
}

export function BlurredImage({
  privacy,
  state,
  src,
  name,
  onRequest,
  pending,
  requestDisabled,
  adminView = false,
  moderation,
}: BlurredImageProps) {
  const t = useTranslations("Profile.photo");
  const revealed = isRevealed(privacy, state, adminView);

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-ink/5">
      {/* Photo (or decorative stand-in when no src is provided). The lock
          badge is suppressed — the request-access overlay below has its own. */}
      {src ? (
        <PrivacyBlur
          src={src}
          alt={t("alt", { name })}
          isUnlocked={revealed}
          showLock={false}
        />
      ) : (
        <div
          className={
            "h-full w-full bg-gradient-to-br from-primary/30 via-success/20 to-accent/20" +
            (revealed ? "" : " blur-2xl scale-110")
          }
          aria-hidden
        />
      )}

      {/* Privacy overlay shown until the viewer is granted access */}
      {!revealed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/35 p-5 text-center backdrop-blur-[2px]">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-ink">
            <LockIcon width={22} height={22} />
          </span>

          {state === "PENDING" ? (
            <>
              <p className="text-sm font-medium text-white">{t("pending")}</p>
              <Button size="sm" variant="secondary" disabled>
                <ClockIcon width={16} height={16} />
                {t("waiting")}
              </Button>
            </>
          ) : state === "DENIED" || state === "REVOKED" ? (
            <>
              <p className="text-sm font-medium text-white">
                {state === "DENIED" ? t("denied") : t("revoked")}
              </p>
              <Button
                size="sm"
                variant="primary"
                onClick={onRequest}
                disabled={pending}
              >
                {t("requestAgain")}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-white">
                {t("blurredNotice")}
              </p>
              <Button
                size="sm"
                variant="primary"
                onClick={onRequest}
                disabled={pending || requestDisabled}
              >
                {requestDisabled ? t("quota.cardButton") : t("request")}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Admin: raw original, plus moderation shortcuts instead of a request */}
      {adminView && (
        <>
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-medium text-white">
            <ShieldCheckIcon width={14} height={14} />
            {t("adminView")}
          </span>
          <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-end gap-2">
            {moderation && moderation !== "APPROVED" && (
              <span
                className={
                  "mr-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-white " +
                  (moderation === "PENDING" ? "bg-accent" : "bg-red-600")
                }
              >
                <ClockIcon width={14} height={14} />
                {moderation === "PENDING"
                  ? t("moderationPending")
                  : t("moderationRejected")}
              </span>
            )}
            {src && (
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-ink hover:bg-white"
              >
                {t("openFull")}
              </a>
            )}
            {moderation === "PENDING" && (
              <Link
                href="/admin/photos"
                className="rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
              >
                {t("reviewInQueue")}
              </Link>
            )}
          </div>
        </>
      )}

      {/* Small confirmation chip when access is granted */}
      {!adminView && revealed && privacy === "BLURRED" && (
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-success px-2.5 py-1 text-xs font-medium text-white">
          <CheckIcon width={14} height={14} />
          {t("granted")}
        </span>
      )}
    </div>
  );
}
