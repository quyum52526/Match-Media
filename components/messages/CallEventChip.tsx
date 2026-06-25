"use client";

import { useTranslations } from "next-intl";
import { PhoneIcon, PhoneOffIcon } from "@/components/ui/icons";

function fmtDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/**
 * Renders a CALL_EVENT message (a centered chip), decoding the compact body code
 * written by the call actions: "ENDED:133" | "MISSED" | "DECLINED".
 * `mine` = the viewer was the caller (the event's sender).
 */
export function CallEventChip({ body, mine }: { body: string; mine: boolean }) {
  const t = useTranslations("Calls.event");
  const [kind, arg] = body.split(":");

  let label: string;
  let missed = false;
  if (kind === "ENDED") {
    label = t("ended", { duration: fmtDuration(Number(arg) || 0) });
  } else if (kind === "MISSED") {
    // From the viewer's perspective: caller sees "no answer", callee sees "missed".
    label = mine ? t("noAnswer") : t("missed");
    missed = true;
  } else if (kind === "DECLINED") {
    label = t("declined");
    missed = true;
  } else {
    label = t("ended", { duration: "" });
  }

  return (
    <div className="flex justify-center py-1">
      <span
        className={
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs " +
          (missed
            ? "bg-red-50 text-red-600"
            : "bg-ink/5 text-ink/60")
        }
      >
        {missed ? (
          <PhoneOffIcon width={13} height={13} />
        ) : (
          <PhoneIcon width={13} height={13} />
        )}
        {label}
      </span>
    </div>
  );
}
