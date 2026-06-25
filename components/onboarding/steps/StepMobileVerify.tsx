"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface Props {
  onNext: () => void;
  onBack: () => void;
}

type Stage = "phone" | "otp";

export function StepMobileVerify({ onNext, onBack }: Props) {
  const [stage, setStage] = useState<Stage>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  function handleOtpChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      (nextInput as HTMLInputElement)?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prev = document.getElementById(`otp-${index - 1}`);
      (prev as HTMLInputElement)?.focus();
    }
  }

  const phoneValid = /^(?:\+?880|0)1[3-9]\d{8}$/.test(phone.trim());
  const otpFilled = otp.every((d) => d !== "");

  if (stage === "otp") {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-sm text-ink">
            We sent a 6-digit code to{" "}
            <span className="font-semibold text-ink">{phone}</span>
          </p>
          <button
            type="button"
            onClick={() => setStage("phone")}
            className="mt-1 text-xs text-primary underline-offset-2 hover:underline"
          >
            Change number
          </button>
        </div>

        {/* OTP boxes */}
        <div className="flex justify-center gap-2">
          {otp.map((digit, i) => (
            <input
              key={i}
              id={`otp-${i}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(i, e)}
              className="h-12 w-10 rounded-card border border-hairline bg-white text-center text-lg font-semibold text-ink caret-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          ))}
        </div>

        <p className="text-center text-xs text-muted">
          Didn't receive it?{" "}
          <button type="button" className="text-primary underline-offset-2 hover:underline">
            Resend code
          </button>
        </p>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStage("phone")} className="flex-1">
            Back
          </Button>
          <Button onClick={onNext} disabled={!otpFilled} className="flex-1">
            Verify & Finish
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        Verifying your mobile number helps build trust with other members and unlocks messaging.
      </p>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
          Mobile Number
        </label>
        <div className="flex rounded-card border border-hairline bg-white ring-inset focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
          <span className="flex items-center pl-3 pr-2 text-sm text-muted select-none">
            🇧🇩 +880
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01XXXXXXXXX"
            className="w-full bg-transparent py-2.5 pr-3 text-sm text-ink placeholder:text-muted/50 focus:outline-none"
          />
        </div>
        {phone && !phoneValid && (
          <p className="mt-1 text-xs text-red-500">Enter a valid Bangladeshi mobile number.</p>
        )}
      </div>

      {/* Trust note */}
      <div className="flex items-start gap-2.5 rounded-card bg-success/10 px-4 py-3">
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
        <p className="text-xs leading-relaxed text-ink/70">
          Your number is <span className="font-semibold text-ink">never shown</span> to other members. It is only used for account security and notifications.
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button
          onClick={() => setStage("otp")}
          disabled={!phoneValid}
          className="flex-1"
        >
          Send Code
        </Button>
      </div>

      <button
        type="button"
        onClick={onNext}
        className="w-full text-center text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
      >
        Skip for now
      </button>
    </div>
  );
}
