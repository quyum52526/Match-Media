"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { sendEmailOtp, verifyEmailOtp } from "@/lib/actions/emailOtp";
import { Button } from "@/components/ui/Button";

const inputClass =
  "h-11 w-full rounded-xl border border-hairline bg-white px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";

const RESEND_SECONDS = 60;

/**
 * The signup email gate: enter the 6-digit code that registration mailed out.
 *
 * Deliberately has no "skip" — this screen stands between a new account and
 * onboarding, and the pages behind it redirect back here until the address is
 * confirmed (the server actions re-check too, so neither can be bypassed).
 *
 * `codeAlreadySent` is true in the normal flow (registration sent one), so the
 * form opens on the code box with the resend cooldown already running instead
 * of mailing a second code the moment the page loads. It auto-requests only
 * when nothing went out — e.g. someone returning to a half-finished signup.
 */
export function VerifyEmailForm({
  email,
  destination,
  codeAlreadySent,
}: {
  email: string;
  /** Where to continue once the address is verified. */
  destination: string;
  codeAlreadySent: boolean;
}) {
  const t = useTranslations("VerifyEmail");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [code, setCode] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(codeAlreadySent ? RESEND_SECONDS : 0);
  const autoSent = useRef(false);

  // Tick the resend cooldown down to zero.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  function send() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await sendEmailOtp();
      if (res.ok) {
        setNotice(t("sent"));
        setCooldown(RESEND_SECONDS);
        return;
      }
      // ALREADY means another tab finished the job — go on rather than show an
      // error for something that is actually success.
      if (res.error === "ALREADY") {
        router.push(destination);
        router.refresh();
        return;
      }
      // RATE_LIMITED means a still-valid code is already out; let them enter it.
      if (res.error === "RATE_LIMITED") setCooldown(RESEND_SECONDS);
      setError(t(`errors.${res.error}`));
    });
  }

  // Nothing in the inbox yet (interrupted signup): request the first code.
  useEffect(() => {
    if (!codeAlreadySent && !autoSent.current) {
      autoSent.current = true;
      send();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeAlreadySent]);

  function verify() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await verifyEmailOtp(code);
      if (res.ok) {
        router.push(destination);
        router.refresh();
      } else {
        setError(t(`errors.${res.error}`));
      }
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink/70">
        {t.rich("sentTo", {
          email,
          b: (c) => <span className="font-body font-semibold">{c}</span>,
        })}
      </p>

      <div className="space-y-1">
        <label htmlFor="emailCode" className="text-sm font-medium text-ink">
          {t("codeLabel")}
        </label>
        <input
          id="emailCode"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className={`${inputClass} font-body tracking-[0.5em]`}
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
        onClick={send}
        className="w-full text-center text-xs font-medium text-primary disabled:text-ink/40"
      >
        {cooldown > 0 ? t("resendIn", { s: String(cooldown) }) : t("resend")}
      </button>

      {notice && <p className="text-sm font-medium text-primary">{notice}</p>}
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
