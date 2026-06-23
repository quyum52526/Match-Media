"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { sendMobileOtp, verifyMobileOtp } from "@/lib/actions/otp";
import { Button } from "@/components/ui/Button";

const inputClass =
  "h-11 w-full rounded-xl border border-charcoal/15 bg-white px-3 text-sm text-charcoal outline-none focus:border-trustGreen focus:ring-2 focus:ring-trustGreen/30";

const RESEND_SECONDS = 60;

/**
 * Mobile verification: enter (or confirm) a BD number, receive a 6-digit code by
 * SMS, then submit it. Auto-requests a code on mount when a number is already on
 * the account. On success, routes home (the verify-mobile banner then clears).
 */
export function VerifyMobileForm({ mobile }: { mobile: string | null }) {
  const t = useTranslations("VerifyMobile");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // "collect" until we have a number to send to, then "verify".
  const [phase, setPhase] = useState<"collect" | "verify">(
    mobile ? "verify" : "collect",
  );
  const [number, setNumber] = useState(mobile ?? "");
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const autoSent = useRef(false);

  // Tick the resend cooldown down to zero.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  function send(num?: string) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await sendMobileOtp(num);
      if (res.ok) {
        setPhase("verify");
        setNotice(t("sent"));
        setCooldown(RESEND_SECONDS);
      } else {
        // RATE_LIMITED means a still-valid code is already out — let them enter it.
        if (res.error === "RATE_LIMITED") {
          setPhase("verify");
          setCooldown(RESEND_SECONDS);
        }
        setError(t(`errors.${res.error}`));
      }
    });
  }

  // Auto-request a code once when a number is already on file.
  useEffect(() => {
    if (mobile && !autoSent.current) {
      autoSent.current = true;
      send();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobile]);

  function verify() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await verifyMobileOtp(code);
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError(t(`errors.${res.error}`));
      }
    });
  }

  return (
    <div className="space-y-4">
      {phase === "collect" ? (
        <div className="space-y-1">
          <label htmlFor="mobile" className="text-sm font-medium text-charcoal">
            {t("numberLabel")}
          </label>
          <input
            id="mobile"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="01XXXXXXXXX"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className={`${inputClass} font-sans`}
          />
          <Button
            type="button"
            fullWidth
            disabled={pending || !number.trim()}
            onClick={() => send(number)}
          >
            {pending ? t("sending") : t("sendCode")}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-charcoal/70">
            {t.rich("sentTo", {
              number: number,
              b: (c) => <span className="font-sans font-semibold">{c}</span>,
            })}
          </p>
          <div className="space-y-1">
            <label htmlFor="code" className="text-sm font-medium text-charcoal">
              {t("codeLabel")}
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className={`${inputClass} font-sans tracking-[0.5em]`}
            />
          </div>
          <Button
            type="button"
            fullWidth
            disabled={pending || code.length !== 6}
            onClick={verify}
          >
            {pending ? t("verifying") : t("verify")}
          </Button>
          <button
            type="button"
            disabled={pending || cooldown > 0}
            onClick={() => send()}
            className="w-full text-center text-xs font-medium text-trustGreen disabled:text-charcoal/40"
          >
            {cooldown > 0 ? t("resendIn", { s: String(cooldown) }) : t("resend")}
          </button>
        </div>
      )}

      {notice && (
        <p className="text-sm font-medium text-trustGreen">{notice}</p>
      )}
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
