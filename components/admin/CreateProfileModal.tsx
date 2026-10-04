"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adminCreateUserProfile,
  type AdminCreateProfileInput,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { GENDERS, PROFESSIONS } from "@/lib/constants/profileOptions";
import { DISTRICTS } from "@/lib/constants/bdGeo";
import { AdminPhotoUploadModal } from "./AdminPhotoUploadModal";

/**
 * "Create profile (manual)" — for intake an admin has already handled
 * off-platform: a walk-in, a phone call, an agency handover.
 *
 * It skips both OTP gates, because the admin filling this in is the one
 * vouching for the person. Self-service signup is untouched; the shortcut
 * lives behind assertAdmin() in the action, not in this form.
 *
 * The generated password is shown ONCE, here, and never again — it is stored
 * as a bcrypt hash like any other. Copy it before closing, or a SUPER_ADMIN
 * can set a new one from the password-reset control on the user row.
 *
 * English-only, like the rest of /admin.
 */

const INPUT =
  "h-11 w-full rounded-xl border border-hairline bg-white px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";
const LABEL = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted";

const CATEGORIES: { value: NonNullable<AdminCreateProfileInput["accountCategory"]>; label: string }[] = [
  { value: "SELF", label: "Personal (has a matrimonial profile)" },
  { value: "PARENTS", label: "Parents / Guardian" },
  { value: "MEDIA", label: "Marriage media agency" },
  { value: "AGENT", label: "Verification agent" },
];

export function CreateProfileModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    userId: string;
    email: string;
    password: string;
    generated: boolean;
    hasProfile: boolean;
  } | null>(null);
  const [uploadingFor, setUploadingFor] = useState(false);

  const [form, setForm] = useState<AdminCreateProfileInput>({
    fullName: "",
    gender: "",
    dateOfBirth: "",
    mobile: "",
    email: "",
    district: "",
    profession: "",
    accountCategory: "SELF",
    markVerified: false,
    password: "",
  });

  function set<K extends keyof AdminCreateProfileInput>(
    key: K,
    value: AdminCreateProfileInput[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await adminCreateUserProfile(form);
      if (result.ok) {
        setCreated({
          userId: result.userId,
          email: result.email,
          password: result.password,
          generated: result.generated,
          hasProfile: result.hasProfile,
        });
        // The new row, the browse feed and the nav counts all move.
        router.refresh();
      } else {
        setError(
          result.error === "FORBIDDEN"
            ? "You are not allowed to do this."
            : result.error,
        );
      }
    });
  }

  // Only a candidate account carries a matrimonial profile, so the biodata
  // fields are the ones that would otherwise be collected at onboarding.
  const isCandidate = form.accountCategory === "SELF";

  return (
    <Modal open onClose={onClose} title="Create profile (manual)">
      {created ? (
        <div className="space-y-4">
          <p className="rounded-card border border-success/30 bg-success/10 px-3 py-2.5 text-sm text-success">
            Account created. Both verification steps are already marked
            complete, so this member can sign in straight away.
          </p>
          <div className="space-y-2">
            <div>
              <span className={LABEL}>Email (their username)</span>
              <code className="block select-all rounded-xl border border-hairline bg-ink/5 px-3 py-2 font-mono text-sm text-ink">
                {created.email}
              </code>
            </div>
            <div>
              <span className={LABEL}>
                Password{created.generated ? " — generated, shown once" : " (as you set it)"}
              </span>
              <code className="block select-all rounded-xl border border-hairline bg-ink/5 px-3 py-2 font-mono text-sm text-ink">
                {created.password}
              </code>
            </div>
          </div>
          <p className="text-xs text-muted">
            Copy these now. The password is stored only as a hash and cannot be
            read again; a SUPER_ADMIN can set a new one from the user row.
          </p>
          <div className="flex gap-2">
            {created.hasProfile && (
              <Button
                type="button"
                variant="outline"
                fullWidth
                onClick={() => setUploadingFor(true)}
              >
                Upload photos
              </Button>
            )}
            <Button type="button" fullWidth onClick={onClose}>
              Done
            </Button>
          </div>

          {uploadingFor && (
            <AdminPhotoUploadModal
              userId={created.userId}
              label={form.fullName || created.email}
              onClose={() => setUploadingFor(false)}
            />
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={LABEL}>
              Account type <span className="text-primary">*</span>
            </label>
            <select
              value={form.accountCategory}
              onChange={(e) =>
                set(
                  "accountCategory",
                  e.target.value as AdminCreateProfileInput["accountCategory"],
                )
              }
              className={INPUT}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL}>
              Full name <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              className={INPUT}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL}>
                Mobile <span className="text-primary">*</span>
              </label>
              <input
                type="tel"
                inputMode="tel"
                placeholder="01XXXXXXXXX"
                value={form.mobile}
                onChange={(e) => set("mobile", e.target.value)}
                className={`${INPUT} font-body`}
                required
              />
            </div>
            <div>
              <label className={LABEL}>Email (optional)</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={INPUT}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL}>
                Gender <span className="text-primary">*</span>
              </label>
              <select
                value={form.gender}
                onChange={(e) => set("gender", e.target.value)}
                className={INPUT}
                required
              >
                <option value="">—</option>
                {GENDERS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.value}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>
                Date of birth <span className="text-primary">*</span>
              </label>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => set("dateOfBirth", e.target.value)}
                max={new Date(Date.now() - 18 * 365.25 * 86400000)
                  .toISOString()
                  .slice(0, 10)}
                className={`${INPUT} font-body`}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL}>District</label>
              <select
                value={form.district}
                onChange={(e) => set("district", e.target.value)}
                className={INPUT}
              >
                <option value="">—</option>
                {DISTRICTS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.value}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>Profession</label>
              <select
                value={form.profession}
                onChange={(e) => set("profession", e.target.value)}
                className={INPUT}
              >
                <option value="">—</option>
                {PROFESSIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isCandidate && (
            <label className="flex items-start gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={Boolean(form.markVerified)}
                onChange={(e) => set("markVerified", e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-ink/30 text-primary focus:ring-primary/30"
              />
              <span>
                Grant the Verified badge
                <span className="block text-xs text-muted">
                  Only tick this if you have actually checked their documents —
                  other members read this badge as identity confirmed.
                </span>
              </span>
            </label>
          )}

          <div>
            <label className={LABEL}>Password</label>
            <input
              type="text"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="Leave blank to auto-generate"
              autoComplete="off"
              className={`${INPUT} font-body`}
            />
            <p className="mt-1 text-xs text-muted">
              At least 8 characters, the same floor self-service signup uses.
            </p>
          </div>

          <p className="rounded-card border border-hairline bg-canvas px-3 py-2 text-xs text-muted">
            Mobile and email verification are marked complete automatically.
            Self-service signup still requires both.
          </p>

          {error && (
            <p className="rounded-card border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" fullWidth disabled={isPending}>
              {isPending ? "Creating…" : "Create profile"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
