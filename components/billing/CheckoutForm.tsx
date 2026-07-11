"use client";

import { useId, useState, useTransition, type ReactNode } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CheckIcon, ShieldCheckIcon, LockIcon } from "@/components/ui/icons";
import { formatTaka } from "@/lib/billing/pricing";

/**
 * Standalone, mobile-first checkout UI for MatchMedia's Pro subscription.
 *
 * Layout: single column on mobile (order summary → billing → payment note), a
 * two-column grid on desktop (forms left, sticky summary right). The submit
 * control is a fixed bottom bar on mobile and an inline footer on desktop —
 * one element, toggled with `fixed … lg:static`, so there's no duplicate CTA.
 *
 * Payment is a "review → pay on gateway" handoff: NO card details are captured
 * here (SSLCommerz is a redirect gateway that collects them on its own page).
 * `onComplete` creates the order and redirects to the gateway; when omitted,
 * submit is simulated so the loading/success states are demonstrable.
 */

export interface CheckoutFormData {
  fullName: string;
  email: string;
  phone: string;
}

interface CheckoutFormProps {
  planName?: string;
  durationDays?: number;
  /** Amounts in poisha (৳1 = 100), matching the billing layer's formatTaka. */
  baseAmount?: number;
  discountAmount?: number;
  couponCode?: string | null;
  /** Real payment handler; when omitted the submit is simulated. */
  onComplete?: (data: CheckoutFormData) => Promise<void> | void;
}

const inputClass =
  "h-12 w-full rounded-xl border border-hairline bg-white px-3.5 text-base text-ink outline-none transition-colors placeholder:text-ink/30 focus:border-primary focus:ring-2 focus:ring-primary/30";

export function CheckoutForm({
  planName = "MatchMedia Pro",
  durationDays = 30,
  baseAmount = 49900,
  discountAmount = 0,
  couponCode = null,
  onComplete,
}: CheckoutFormProps) {
  const [status, setStatus] = useState<"idle" | "processing" | "done">("idle");
  const [isPending, startTransition] = useTransition();
  // Busy = a live payment transition is running OR the demo timer is ticking.
  const busy = isPending || status === "processing";

  const total = Math.max(0, baseAmount - discountAmount);
  const totalLabel = `৳${formatTaka(total)}`;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;

    const form = new FormData(e.currentTarget);
    const data: CheckoutFormData = {
      fullName: String(form.get("fullName") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
    };

    if (onComplete) {
      // Live flow: onComplete creates the order and redirects to the payment
      // gateway. It MUST run inside a transition so Next applies the redirect
      // navigation — a plain `await` swallows a server-action redirect and the
      // page would falsely fall through to the success state. No "done" here:
      // the browser leaves for the gateway.
      startTransition(async () => {
        await onComplete(data);
      });
    } else {
      // Demo (no handler): simulate a gateway round-trip, then confirm inline.
      setStatus("processing");
      window.setTimeout(() => setStatus("done"), 1600);
    }
  }

  if (status === "done") {
    return (
      <Card>
        <CardBody className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckIcon width={28} height={28} />
          </span>
          <h2 className="font-display text-xl font-semibold text-ink">
            Payment complete
          </h2>
          <p className="max-w-sm text-sm text-ink/60">
            Your {planName} membership is now active. A receipt has been sent to
            your email.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Checkout"
      // Extra bottom room on mobile so the fixed CTA bar never covers fields.
      className="pb-28 lg:pb-0"
    >
      <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
        {/* ── Forms: left on desktop, second on mobile ─────────────────── */}
        <div className="order-2 space-y-6 lg:order-1 lg:col-span-2">
          {/* Billing details (replaces "shipping" — this is a digital plan) */}
          <Card>
            <CardBody>
              <FieldsetLegend
                title="Billing details"
                hint="Where we'll send your receipt."
              />
              <div className="mt-4 space-y-4">
                <Field label="Full name" name="fullName" required>
                  {(id) => (
                    <input
                      id={id}
                      name="fullName"
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="Rahim Uddin"
                      className={inputClass}
                    />
                  )}
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Email" name="email" required>
                    {(id) => (
                      <input
                        id={id}
                        name="email"
                        type="email"
                        required
                        inputMode="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        className={inputClass}
                      />
                    )}
                  </Field>
                  <Field label="Phone" name="phone" required>
                    {(id) => (
                      <input
                        id={id}
                        name="phone"
                        type="tel"
                        required
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="01XXXXXXXXX"
                        className={inputClass}
                      />
                    )}
                  </Field>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Payment — handled on the gateway (SSLCommerz), not here. We
              collect no card details; the user pays after being redirected. */}
          <Card>
            <CardBody>
              <FieldsetLegend
                title="Payment"
                hint={
                  <span className="inline-flex items-center gap-1">
                    <LockIcon width={13} height={13} />
                    Review → Pay on gateway
                  </span>
                }
              />
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-hairline bg-canvas/60 p-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <LockIcon width={18} height={18} />
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">
                    Review your order, then pay on our secure gateway
                  </p>
                  <p className="mt-0.5 text-sm text-ink/60">
                    When you continue, we&apos;ll redirect you to our payment
                    partner (SSLCommerz) to pay by card or mobile banking. Your
                    payment details are entered there — never on this page.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* ── Order summary: right on desktop, first on mobile ─────────── */}
        <aside
          aria-label="Order summary"
          className="order-1 lg:order-2 lg:col-span-1"
        >
          <Card className="lg:sticky lg:top-24">
            <CardBody className="space-y-4">
              <h2 className="text-sm font-semibold text-ink">Order summary</h2>

              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">{planName}</p>
                  <p className="text-xs text-ink/50">
                    {durationDays}-day membership
                  </p>
                </div>
                <p className="font-body font-medium text-ink">
                  ৳{formatTaka(baseAmount)}
                </p>
              </div>

              <hr className="border-hairline" />

              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink/60">Subtotal</dt>
                  <dd className="text-ink">৳{formatTaka(baseAmount)}</dd>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-primary">
                    <dt>Discount{couponCode ? ` (${couponCode})` : ""}</dt>
                    <dd>−৳{formatTaka(discountAmount)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-hairline pt-2 text-base font-semibold">
                  <dt className="text-ink">Total</dt>
                  <dd className="text-ink">{totalLabel}</dd>
                </div>
              </dl>

              <p className="flex items-center gap-1.5 text-xs text-ink/50">
                <ShieldCheckIcon width={14} height={14} className="text-success" />
                Cancel anytime. No auto-renewal without notice.
              </p>
            </CardBody>
          </Card>
        </aside>
      </div>

      {/* ── Submit: fixed bottom bar on mobile, inline footer on desktop ── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-canvas/95 backdrop-blur lg:static lg:mt-8 lg:border-0 lg:bg-transparent lg:backdrop-blur-none">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 lg:justify-end lg:px-0 lg:py-0">
          {/* Total is echoed here on mobile, where the summary has scrolled away */}
          <div className="lg:hidden">
            <p className="text-xs text-ink/50">Total</p>
            <p className="text-base font-semibold text-ink">{totalLabel}</p>
          </div>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={busy}
            aria-busy={busy}
            className="min-w-[55%] sm:min-w-[240px] lg:min-w-[240px]"
          >
            {busy ? (
              <>
                <Spinner />
                Processing…
              </>
            ) : (
              <>Continue to Payment · {totalLabel}</>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                       */
/* ------------------------------------------------------------------ */

/** Grouped section title + optional hint, rendered as a semantic legend. */
function FieldsetLegend({
  title,
  hint,
}: {
  title: string;
  hint?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {hint && <span className="text-xs text-ink/45">{hint}</span>}
    </div>
  );
}

/** Label + control pair with a generated id so htmlFor always matches. */
function Field({
  label,
  name,
  required,
  children,
}: {
  label: string;
  name: string;
  required?: boolean;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children(id)}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
  );
}
