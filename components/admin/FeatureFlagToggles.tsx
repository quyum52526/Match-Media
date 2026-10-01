"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Check, Lock } from "lucide-react";
import { updateFeatureFlag } from "@/lib/actions/admin";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export interface FlagRow {
  key: string;
  enabled: boolean;
  label: string;
  description: string;
  /** Shown when the flag is in its risky position — copy supplied by the page. */
  warning?: string;
  /** True when the flag currently controls nothing (no implementation behind it). */
  inert?: boolean;
}

/**
 * Admin toggles for the runtime feature flags.
 *
 * Optimistic: the switch moves immediately and reverts if the server rejects, so
 * an admin never sits watching a spinner to learn whether a boolean changed. The
 * server action is the authority — it re-checks `assertSuperAdmin()` and validates
 * the key against the catalog, so a tampered request can neither write an unknown
 * flag nor flip one as a moderator.
 *
 * `canEdit` is cosmetic (false for a moderator): it disables the switches and
 * shows the read-only notice. A tampered client still gets FORBIDDEN, which
 * surfaces as the per-row error.
 */
export function FeatureFlagToggles({
  flags,
  title,
  intro,
  savedLabel,
  errorLabel,
  inertLabel,
  canEdit,
  readOnlyLabel,
}: {
  flags: FlagRow[];
  title: string;
  intro: string;
  savedLabel: string;
  errorLabel: string;
  inertLabel: string;
  /** False for a plain ADMIN — the panel renders without working controls. */
  canEdit: boolean;
  readOnlyLabel: string;
}) {
  const [state, setState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(flags.map((f) => [f.key, f.enabled])),
  );
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggle(key: string) {
    if (!canEdit) return;
    const next = !state[key];
    // Move now, reconcile after — and remember the previous value so a rejection
    // can put the switch back exactly where it was.
    const previous = state[key];
    setState((s) => ({ ...s, [key]: next }));
    setPendingKey(key);
    setSavedKey(null);
    setFailedKey(null);

    startTransition(async () => {
      const result = await updateFeatureFlag(key, next);
      setPendingKey(null);
      if (result.ok) {
        setSavedKey(key);
      } else {
        setState((s) => ({ ...s, [key]: previous }));
        setFailedKey(key);
      }
    });
  }

  return (
    <Card>
      <CardBody className="space-y-5">
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="mt-1 text-sm text-ink/60">{intro}</p>
          {!canEdit && (
            <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-hairline bg-ink/5 px-2.5 py-1.5 text-xs leading-relaxed text-ink/70">
              <Lock size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{readOnlyLabel}</span>
            </p>
          )}
        </div>

        <ul className="divide-y divide-ink/10">
          {flags.map((flag) => {
            const on = state[flag.key];
            const busy = pendingKey === flag.key;
            return (
              <li
                key={flag.key}
                className="flex items-start justify-between gap-4 py-4"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                    {flag.label}
                    {flag.inert && (
                      <span className="rounded-full border border-hairline bg-ink/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink/50">
                        {inertLabel}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-ink/60">
                    {flag.description}
                  </p>

                  {/* Only surfaced while the flag actually sits in the risky
                      position, so the warning means something when it appears. */}
                  {flag.warning && (
                    <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs leading-relaxed text-amber-900">
                      <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                      <span>{flag.warning}</span>
                    </p>
                  )}

                  {savedKey === flag.key && (
                    <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                      <Check size={13} aria-hidden="true" />
                      {savedLabel}
                    </p>
                  )}
                  {failedKey === flag.key && (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {errorLabel}
                    </p>
                  )}
                </div>

                {/* A real checkbox styled as a switch: keyboard operable and
                    announced with its state, which a <div onClick> is not. */}
                <label
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                    on ? "bg-primary" : "bg-ink/20",
                    busy && "opacity-60",
                    canEdit ? "cursor-pointer" : "cursor-not-allowed opacity-60",
                  )}
                >
                  <input
                    type="checkbox"
                    role="switch"
                    checked={on}
                    disabled={busy || !canEdit}
                    onChange={() => toggle(flag.key)}
                    aria-label={flag.label}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40",
                      on && "translate-x-5",
                    )}
                  />
                </label>
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}
