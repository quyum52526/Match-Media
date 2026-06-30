"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { StepCategorySelect, type AccountCategory } from "./steps/StepCategorySelect";
import { StepBasicDetails } from "./steps/StepBasicDetails";
import { StepMediaDetails } from "./steps/StepMediaDetails";
import { StepPhotoUpload } from "./steps/StepPhotoUpload";
import { StepMobileVerify } from "./steps/StepMobileVerify";

// ---------------------------------------------------------------------------
// Step routing
//
// Each AccountCategory maps to its own ordered step list:
//
//  SELF     → Category → Basic Details → Photo → Mobile Verify
//  PARENTS  → Category → Mobile Verify  (no matrimonial profile; they manage
//             child profiles from their Guardian Dashboard after onboarding)
//  MEDIA    → Category → Basic Details → Mobile Verify  (no photo; they
//             manage client profiles separately after onboarding)
//  AGENT    → Category → Mobile Verify  (no matrimonial profile at all;
//             goes straight to admin-verification queue after this)
// ---------------------------------------------------------------------------

type StepId = "CATEGORY" | "BASIC" | "PHOTO" | "VERIFY" | "DONE";

function stepsFor(category: AccountCategory | null): StepId[] {
  switch (category) {
    case "SELF":
      return ["CATEGORY", "BASIC", "PHOTO", "VERIFY"];
    case "PARENTS":
      return ["CATEGORY", "VERIFY"];
    case "MEDIA":
      return ["CATEGORY", "BASIC", "VERIFY"];
    case "AGENT":
      return ["CATEGORY", "VERIFY"];
    default:
      // Pre-selection: show the standard 4-step path as a preview so the
      // counter reads "Step 1 of 4" rather than the confusing "Step 1 of 1".
      return ["CATEGORY", "BASIC", "PHOTO", "VERIFY"];
  }
}

const STEP_LABELS: Record<StepId, string> = {
  CATEGORY: "Account Type",
  BASIC: "Basic Details",
  PHOTO: "Photo",
  VERIFY: "Verify",
  DONE: "Done",
};

// The "BASIC" step label differs by category.
function stepLabel(stepId: StepId, category: AccountCategory | null): string {
  if (stepId === "BASIC" && category === "MEDIA") return "Agency Details";
  return STEP_LABELS[stepId];
}

export function OnboardingWizard() {
  const [category, setCategory] = useState<AccountCategory | null>(null);
  const [stepIndex, setStepIndex] = useState(0); // index into stepsFor(category)
  const [toast, setToast] = useState(false);
  const [toastFading, setToastFading] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (searchParams.get("success") !== "true") return;
    // Strip the param from the URL so a refresh doesn't re-show the toast
    router.replace(pathname, { scroll: false });
    setToast(true);
    setToastFading(false);
    const fadeTimer = setTimeout(() => setToastFading(true), 1600);
    const hideTimer = setTimeout(() => setToast(false), 2200);
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // ── Success toast (post-redirect from registration) ─────────────────────
  const toastEl = toast ? (
    <div
      role="status"
      aria-live="polite"
      className={[
        "fixed left-1/2 top-6 z-50 -translate-x-1/2",
        "flex items-center gap-3 rounded-2xl bg-ink px-5 py-3.5 shadow-lg",
        "transition-opacity duration-500",
        toastFading ? "opacity-0" : "opacity-100",
      ].join(" ")}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success">
        <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
          <path d="M3 8l3.5 3.5L13 4.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <p className="text-sm font-semibold text-white">
        Success! You&apos;ve unlocked 3 months of Pro access.
      </p>
    </div>
  ) : null;

  // ── Done screen ──────────────────────────────────────────────────────────
  if (stepIndex >= steps.length) {
    const isAgent = category === "AGENT";
    const isParents = category === "PARENTS";

    const title = isAgent ? "Application Submitted!" : "You're all set!";
    const body = isAgent
      ? "Your agent account is pending admin verification. We'll notify you once approved. Service fee: ৳2,500 per assignment."
      : isParents
      ? "Your Guardian account is ready. Go to your dashboard to add your child's matrimonial profile."
      : "Your profile is being reviewed. We'll notify you once your photo is approved.";

    return (
      <>
        {toastEl}
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>
        <p className="max-w-xs text-sm text-muted">{body}</p>
        <a
          href="/"
          className="mt-2 inline-flex h-11 items-center rounded-pill bg-primary px-6 text-sm font-medium text-white transition hover:bg-primary-dark"
        >
          Go to Dashboard
        </a>
      </div>
      </>
    );
  }

  // ── Wizard shell ─────────────────────────────────────────────────────────
  return (
    <>
      {toastEl}
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      {/* Header */}
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Step {stepIndex + 1} of {totalVisible}
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
          {stepLabel(currentStep, category)}
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
                  {stepLabel(stepId, category)}
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
        {currentStep === "BASIC" && category === "MEDIA" && (
          <StepMediaDetails onNext={next} onBack={back} />
        )}
        {currentStep === "BASIC" && category !== "MEDIA" && (
          <StepBasicDetails category={category!} onNext={next} />
        )}
        {currentStep === "PHOTO" && (
          <StepPhotoUpload onNext={next} onBack={back} />
        )}
        {currentStep === "VERIFY" && (
          <StepMobileVerify onNext={next} onBack={back} />
        )}
      </div>
    </div>
    </>
  );
}
