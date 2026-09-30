"use client";

import { useState, useTransition } from "react";
import { sendEmailOtp, verifyEmailOtp } from "@/lib/actions/emailOtp";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";

/**
 * Email verification step: request a code, then enter it.
 *
 * Two stages in local state rather than two routes, matching how the mobile OTP
 * form behaves. Error codes come back from the server action and are rendered
 * from a local map — the action is the authority on what failed.
 */
const ERRORS: Record<string, string> = {
  UNAUTH: "Please log in again.",
  DISABLED: "Email verification is currently turned off.",
  ALREADY: "Your email is already verified.",
  RATE_LIMITED: "Please wait a minute before requesting another code.",
  SEND_FAILED: "We couldn't send the email. Please try again.",
  NO_CODE: "Request a code first.",
  EXPIRED: "That code has expired — request a new one.",
  TOO_MANY: "Too many wrong attempts. Request a new code.",
  INVALID: "That code is not correct.",
};

export function EmailVerifyCard({
  email,
  verified,
}: {
  email: string;
  verified: boolean;
}) {
  const [stage, setStage] = useState<"idle" | "code" | "done">(
    verified ? "done" : "idle",
  );
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function request() {
    setError(null);
    startTransition(async () => {
      const res = await sendEmailOtp();
      if (res.ok) setStage("code");
      else setError(ERRORS[res.error] ?? res.error);
    });
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await verifyEmailOtp(code);
      if (res.ok) setStage("done");
      else setError(ERRORS[res.error] ?? res.error);
    });
  }

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>Email Address</CardTitle>
            <p className="mt-1 truncate text-sm text-muted">{email}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
              stage === "done"
                ? "bg-success/10 text-success"
                : "bg-ink/5 text-ink/50"
            }`}
          >
            {stage === "done" ? "Verified" : "Unverified"}
          </span>
        </div>

        {stage === "idle" && (
          <div className="space-y-2">
            <p className="text-xs text-muted">
              We&apos;ll email you a 6-digit code. It expires in 10 minutes.
            </p>
            <Button size="sm" onClick={request} disabled={pending}>
              {pending ? "Sending…" : "Send code"}
            </Button>
          </div>
        )}

        {stage === "code" && (
          <div className="space-y-2">
            <label htmlFor="emailOtp" className="block text-xs text-muted">
              Enter the code sent to {email}
            </label>
            <div className="flex gap-2">
              <input
                id="emailOtp"
                value={code}
                onChange={(e) =>
                  // Digits only, capped at 6 — keeps the field aligned with what
                  // the server will accept.
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                className="h-10 w-32 rounded-xl border border-hairline bg-white px-3 font-body text-sm tracking-[0.3em] text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
              <Button size="sm" onClick={submit} disabled={pending || code.length !== 6}>
                {pending ? "Checking…" : "Verify"}
              </Button>
            </div>
            <button
              type="button"
              onClick={request}
              disabled={pending}
              className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
            >
              Resend code
            </button>
          </div>
        )}

        {stage === "done" && (
          <p className="text-sm text-success">Your email has been verified. ✓</p>
        )}

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      </CardBody>
    </Card>
  );
}
