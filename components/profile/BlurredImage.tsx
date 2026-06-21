import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { LockIcon, ClockIcon, CheckIcon } from "@/components/ui/icons";
import type { ImagePrivacy, PhotoAccessState } from "./types";

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
}

/** Has the viewer earned a clear look at the photo? */
function isRevealed(privacy: ImagePrivacy, state: PhotoAccessState): boolean {
  return privacy === "PUBLIC" || state === "APPROVED";
}

export function BlurredImage({
  privacy,
  state,
  src,
  name,
  onRequest,
  pending,
  requestDisabled,
}: BlurredImageProps) {
  const t = useTranslations("Profile.photo");
  const revealed = isRevealed(privacy, state);

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-charcoal/5">
      {/* Photo (or decorative stand-in when no src is provided) */}
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={t("alt", { name })}
          className={
            revealed
              ? "h-full w-full object-cover"
              : "h-full w-full object-cover blur-2xl scale-110"
          }
        />
      ) : (
        <div
          className={
            "h-full w-full bg-gradient-to-br from-trustGreen/30 via-verifyGreen/20 to-gold/20" +
            (revealed ? "" : " blur-2xl scale-110")
          }
          aria-hidden
        />
      )}

      {/* Privacy overlay shown until the viewer is granted access */}
      {!revealed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-charcoal/35 p-5 text-center backdrop-blur-[2px]">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-charcoal">
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

      {/* Small confirmation chip when access is granted */}
      {revealed && privacy === "BLURRED" && (
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-verifyGreen px-2.5 py-1 text-xs font-medium text-white">
          <CheckIcon width={14} height={14} />
          {t("granted")}
        </span>
      )}
    </div>
  );
}
