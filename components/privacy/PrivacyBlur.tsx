import { LockIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface PrivacyBlurProps {
  src: string;
  alt?: string;
  /** When false the image renders blurred with a lock badge. */
  isUnlocked: boolean;
  /** Hide the built-in lock overlay when the parent renders its own. */
  showLock?: boolean;
  className?: string;
}

/**
 * Privacy wrapper for images: renders `src` sharp when unlocked, otherwise
 * blurred (`blur-xl`) under a lock badge. Purely visual — always pair it with
 * a server that only signs teaser/blurred assets for locked viewers (see
 * lib/data/profiles.ts): client-side blur alone never protects the URL.
 */
export function PrivacyBlur({
  src,
  alt = "",
  isUnlocked,
  showLock = true,
  className,
}: PrivacyBlurProps) {
  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={cn(
          "h-full w-full object-cover",
          !isUnlocked && "scale-110 blur-xl",
        )}
      />
      {!isUnlocked && showLock && (
        <span className="absolute inset-0 flex items-center justify-center bg-ink/30">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-ink">
            <LockIcon width={22} height={22} />
          </span>
        </span>
      )}
    </div>
  );
}
