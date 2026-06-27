"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { StepCategorySelect, type AccountCategory } from "./steps/StepCategorySelect";
import { StepBasicDetails } from "./steps/StepBasicDetails";
import { StepPhotoUpload } from "./steps/StepPhotoUpload";
import { StepMobileVerify } from "./steps/StepMobileVerify";

// ---------------------------------------------------------------------------
// Step routing
//
// Each AccountCategory maps to its own ordered step list:
//
//  SELF / PARENTS  → Category → Basic Details → Photo → Mobile Verify
//  MEDIA           → Category → Basic Details → Mobile Verify  (no photo; they
//                    manage client profiles separately after onboarding)
//  AGENT           → Category → Mobile Verify  (no matrimonial profile at all;
//                    goes straight to admin-verification queue after this)
// ---------------------------------------------------------------------------

type StepId = "CATEGORY" | "BASIC" | "PHOTO" | "VERIFY" | "DONE";

function stepsFor(category: AccountCategory | null): StepId[] {
  switch (category) {
    case "SELF":
    case "PARENTS":
      return ["CATEGORY", "BASIC", "PHOTO", "VERIFY"];
    case "MEDIA":
      return ["CATEGORY", "BASIC", "VERIFY"];
    case "AGENT":
      return ["CATEGORY", "VERIFY"];
    default:
      return ["CATEGORY"]; // pre-selection: only first step visible
  }
}

const STEP_LABELS: Record<StepId, string> = {
  CATEGORY: "Account Type",
  BASIC: "Basic Details",
  PHOTO: "Photo",
  VERIFY: "Verify",
  DONE: "Done",
};

export function OnboardingWizard() {
  const [category, setCategory] = useState<AccountCategory | null>(null);
  const [stepIndex, setStepIndex] = useState(0); // index into stepsFor(category)

  const steps = stepsFor(category);
  const currentStep = steps[stepIndex];
  const totalVisible = steps.length; // excludes "DONE"

  // Progress bar fills based on the steps in the active route (not a fixed 3).
  const progress = totalVisible <= 1 ? 0 : (stepIndex / (totalVisible - 1)) * 100;

  function next() {
    if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1);
    else setStepIndex(steps.length); // past last step → done
  }
  function back() {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  }

  // ── Done screen ──────────────────────────────────────────────────────────
  if (stepIndex >= steps.length) {
    const isAgent = category === "AGENT";
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-display text-2xl font-semibold text-ink">
          {isAgent ? "Application Submitted!" : "You're all set!"}
        </h2>
        <p className="max-w-xs text-sm text-muted">
          {isAgent
            ? "Your agent account is pending admin verification. We'll notify you once approved. Service fee: ৳2,500 per assignment."
            : "Your profile is being reviewed. We'll notify you once your photo is approved."}
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

  // ── Wizard shell ─────────────────────────────────────────────────────────
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      {/* Header */}
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Step {stepIndex + 1} of {totalVisible}
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
          {STEP_LABELS[currentStep]}
        </h1>
      </div>

      {/* Progress bar */}
      <div className="mb-10">
        <div className="relative mb-4 h-1.5 w-full overflow-hidden rounded-full bg-hairline">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-in-out"
            style={{ width: `${progress === 0 ? 4 : progress}%` }}
          />
        </div>

        {/* Step dots — only show the route for the chosen category */}
        <ol className="flex justify-between">
          {steps.map((stepId, i) => {
            const isComplete = stepIndex > i;
            const isActive = stepIndex === i;
            return (
              <li key={stepId} className="flex flex-col items-center gap-1">
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
                    i + 1
                  )}
                </span>
                <span className={cn(
                  "hidden text-[11px] font-medium sm:block",
                  isActive ? "text-primary" : "text-muted",
                )}>
                  {STEP_LABELS[stepId]}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Step content */}
      <div className="rounded-card bg-surface p-6 shadow-card">
        {currentStep === "CATEGORY" && (
          <StepCategorySelect
            onNext={(cat) => {
              setCategory(cat);
              setStepIndex(1); // always move to index 1; route recalculates via stepsFor
            }}
          />
        )}
        {currentStep === "BASIC" && (
          <StepBasicDetails onNext={next} />
        )}
        {currentStep === "PHOTO" && (
          <StepPhotoUpload onNext={next} onBack={back} />
        )}
        {currentStep === "VERIFY" && (
          <StepMobileVerify onNext={next} onBack={back} />
        )}
      </div>
    </div>
  );
}
