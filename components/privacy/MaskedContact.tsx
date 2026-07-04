import { LockIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { maskContact } from "@/lib/privacy";

interface MaskedContactProps {
  /**
   * Phone number or email (auto-detected). May already be masked — the data
   * layer masks server-side and masking is idempotent, so re-masking here is
   * a safe no-op.
   */
  value: string;
  /** Reveal the raw value. Defaults to false — masked is the safe default. */
  isUnlocked?: boolean;
  className?: string;
}

/**
 * Shows contact info as "018****3456" / "a***@gmail.com" with a small lock,
 * unless explicitly unlocked. NOTE: under the platform's strict-privacy
 * policy the server never sends raw contact data to profile views, so
 * `isUnlocked` is only meaningful in owner/admin contexts.
 */
export function MaskedContact({
  value,
  isUnlocked = false,
  className,
}: MaskedContactProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-body text-sm font-medium text-ink",
        className,
      )}
    >
      {!isUnlocked && (
        <LockIcon width={14} height={14} className="shrink-0 text-ink/40" />
      )}
      {isUnlocked ? value : maskContact(value)}
    </span>
  );
}
