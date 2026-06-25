"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  PhoneIcon,
  PhoneOffIcon,
  MicIcon,
  MicOffIcon,
} from "@/components/ui/icons";
import type { ActiveCall } from "./CallProvider";

function fmt(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Audio-only call overlay. A fixed, centered card that adapts to the call phase
 * (outgoing / incoming / connecting / active / ended) with the right controls.
 * Media playback lives in CallProvider; this is purely presentational + buttons.
 */
export function CallOverlay({
  call,
  muted,
  micUnavailable,
  onAccept,
  onDecline,
  onHangUp,
  onToggleMute,
}: {
  call: ActiveCall;
  muted: boolean;
  micUnavailable?: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onHangUp: () => void;
  onToggleMute: () => void;
}) {
  const t = useTranslations("Calls");
  const [elapsed, setElapsed] = useState(0);

  // Run the duration timer only while the call is active.
  useEffect(() => {
    if (call.phase !== "active") return;
    setElapsed(0);
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [call.phase]);

  const status =
    call.phase === "active"
      ? fmt(elapsed)
      : call.phase === "outgoing"
        ? t("calling")
        : call.phase === "incoming"
          ? t("incoming")
          : call.phase === "connecting"
            ? t("connecting")
            : t("ended");

  const initial = (call.peerName.trim()[0] ?? "?").toUpperCase();
  const showMute = call.phase === "active" || call.phase === "connecting";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 backdrop-blur-sm">
      <div className="w-[88%] max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
          {initial}
        </div>
        <h2 className="mt-4 text-lg font-bold text-ink">
          {call.peerName || t("unknownCaller")}
        </h2>
        <p className="mt-1 flex items-center justify-center gap-1.5 font-body text-sm text-ink/60">
          <PhoneIcon width={14} height={14} />
          {status}
        </p>
        {micUnavailable && call.phase !== "incoming" && call.phase !== "ended" && (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-amber-600">
            <MicOffIcon width={13} height={13} />
            {t("micUnavailable")}
          </p>
        )}

        <div className="mt-6 flex items-center justify-center gap-4">
          {call.phase === "incoming" ? (
            <>
              <button
                type="button"
                onClick={onDecline}
                aria-label={t("decline")}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600"
              >
                <PhoneOffIcon width={24} height={24} />
              </button>
              <button
                type="button"
                onClick={onAccept}
                aria-label={t("accept")}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary/90"
              >
                <PhoneIcon width={24} height={24} />
              </button>
            </>
          ) : call.phase === "ended" ? null : (
            <>
              {showMute && (
                <button
                  type="button"
                  onClick={onToggleMute}
                  aria-label={muted ? t("unmute") : t("mute")}
                  className={
                    "flex h-12 w-12 items-center justify-center rounded-full transition-colors " +
                    (muted
                      ? "bg-ink text-white"
                      : "bg-ink/10 text-ink hover:bg-ink/20")
                  }
                >
                  {muted ? (
                    <MicOffIcon width={20} height={20} />
                  ) : (
                    <MicIcon width={20} height={20} />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={onHangUp}
                aria-label={t("hangUp")}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600"
              >
                <PhoneOffIcon width={24} height={24} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
