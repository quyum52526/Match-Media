"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { StepBasicDetails } from "./steps/StepBasicDetails";
import { StepPhotoUpload } from "./steps/StepPhotoUpload";
import { StepMobileVerify } from "./steps/StepMobileVerify";

const STEPS = [
  { id: 1, label: "Basic Details" },
  { id: 2, label: "Photo" },
  { id: 3, label: "Verify" },
];

export function OnboardingWizard() {
  const [current, setCurrent] = useState(1);
  const [done, setDone] = useState(false);

  const progress = ((current - 1) / (STEPS.length - 1)) * 100;

  function next() {
    if (current < STEPS.length) setCurrent((s) => s + 1);
    else setDone(true);
  }
  function back() {
    if (current > 1) setCurrent((s) => s - 1);
  }

  if (done) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-display text-2xl font-semibold text-ink">You're all set!</h2>
        <p className="max-w-xs text-sm text-muted">
          Your profile is being reviewed. We'll notify you once your photo is approved.
        </p>
        <a
          href="/"
          className="mt-2 inline-flex h-11 items-center rounded-pill bg-primary px-6 text-sm font-medium text-white transition hover:bg-primary-dark"
        >
          Go to Dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      {/* ── Header ── */}
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Step {current} of {STEPS.length}
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
          {STEPS[current - 1].label}
        </h1>
      </div>

      {/* ── Stepper ── */}
      <div className="mb-10">
        {/* Pill track */}
        <div className="relative mb-4 h-1.5 w-full overflow-hidden rounded-full bg-hairline">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-in-out"
            style={{ width: `${progress === 0 ? 4 : progress}%` }}
          />
        </div>

        {/* Step labels */}
        <ol className="flex justify-between">
          {STEPS.map((step) => {
            const isComplete = current > step.id;
            const isActive = current === step.id;
            return (
              <li key={step.id} className="flex flex-col items-center gap-1">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ring-2 transition-all duration-300",
                    isComplete
                      ? "bg-primary ring-primary text-white"
                      : isActive
                      ? "bg-white ring-primary text-primary"
                      : "bg-white ring-hairline text-muted",
                  )}
                >
                  {isComplete ? (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.id
                  )}
                </span>
                <span
                  className={cn(
                    "hidden text-[11px] font-medium sm:block",
                    isActive ? "text-primary" : "text-muted",
                  )}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* ── Step content ── */}
      <div className="rounded-card bg-surface p-6 shadow-card">
        {current === 1 && <StepBasicDetails onNext={next} />}
        {current === 2 && <StepPhotoUpload onNext={next} onBack={back} />}
        {current === 3 && <StepMobileVerify onNext={next} onBack={back} />}
      </div>
    </div>
  );
}
