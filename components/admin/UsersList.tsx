"use client";

import { useState, useTransition, useCallback } from "react";
import { resetUserPassword } from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { CreateProfileModal } from "./CreateProfileModal";
import { AdminPhotoUploadModal } from "./AdminPhotoUploadModal";
import { Badge } from "@/components/ui/Badge";
import { CheckIcon, XIcon } from "@/components/ui/icons";
import { formatDate } from "@/lib/utils";
import type { AdminUser } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Cryptographically random 12-char password (upper + lower + digits). */
function generatePassword(): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join("");
}

// ---------------------------------------------------------------------------
// Sub-component: Reset Password modal
// ---------------------------------------------------------------------------

interface ResetModalProps {
  user: AdminUser;
  onClose: () => void;
}

function ResetModal({ user, onClose }: ResetModalProps) {
  const [password, setPassword] = useState(() => generatePassword());
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleGenerate = useCallback(() => {
    setPassword(generatePassword());
    setConfirmed(false);
    setError(null);
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(password).catch(() => {});
  }, [password]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    startTransition(async () => {
      const res = await resetUserPassword(user.id, password);
      if (res.ok) {
        setConfirmed(true);
      } else {
        setError(
          res.error === "TOO_SHORT"
            ? "Password must be at least 8 characters."
            : res.error === "NOT_FOUND"
              ? "User not found."
              : res.error === "FORBIDDEN"
                ? "You are not authorised to do this."
                : "Something went wrong. Please try again.",
        );
      }
    });
  }

  return (
    <Modal open onClose={onClose} title="Reset Password">
      {confirmed ? (
        /* ── Success state ── */
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-xl bg-success/10 p-3 text-sm text-success">
            <CheckIcon width={16} height={16} />
            <span>Password updated. Copy it now — it won't be shown again.</span>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-ink/60">
              New password for <span className="font-semibold text-ink">{user.email}</span>
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded-xl border border-hairline bg-ink/5 px-3 py-2 font-mono text-sm text-ink select-all">
                {password}
              </code>
              <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
                Copy
              </Button>
            </div>
          </div>

          <Button fullWidth variant="ghost" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        /* ── Form state ── */
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-ink/70">
            Set a new password for{" "}
            <span className="font-semibold text-ink">{user.email}</span>.
            Share it with the user securely — you'll see it once after saving.
          </p>

          <div className="space-y-1">
            <label className="text-xs font-medium text-ink/60" htmlFor="new-password">
              New password
            </label>
            <div className="flex gap-2">
              <input
                id="new-password"
                type="text"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                minLength={8}
                required
                autoComplete="new-password"
                className="h-10 flex-1 rounded-xl border border-hairline bg-white px-3 font-mono text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerate}
              >
                Generate
              </Button>
            </div>
            {error && (
              <p className="flex items-center gap-1 text-xs text-red-600">
                <XIcon width={12} height={12} />
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={isPending}
            >
              {isPending ? "Saving…" : "Save new password"}
            </Button>
            <Button type="button" variant="ghost" size="md" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface UsersListProps {
  users: AdminUser[];
  /**
   * True only for SUPER_ADMIN. Password reset is account takeover, so it is
   * owner-only — a moderator sees the list without the control. Cosmetic:
   * resetUserPassword() itself gates on assertSuperAdmin().
   */
  canResetPasswords: boolean;
}

export function UsersList({ users, canResetPasswords }: UsersListProps) {
  const [search, setSearch] = useState("");
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [photoTarget, setPhotoTarget] = useState<AdminUser | null>(null);

  const filtered = search.trim()
    ? users.filter(
        (u) =>
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          (u.profileName ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : users;

  return (
    <div className="space-y-4">
      {/* Search + manual intake */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          placeholder="Search by email or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full max-w-sm rounded-xl border border-hairline bg-white px-3 text-sm text-ink placeholder:text-ink/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button size="sm" onClick={() => setCreating(true)}>
          Create profile
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-ink/50">No users match your search.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ink/10 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left">
                <th className="px-4 py-3 font-semibold text-ink/60">Email</th>
                <th className="px-4 py-3 font-semibold text-ink/60">Profile name</th>
                <th className="px-4 py-3 font-semibold text-ink/60">Role / Category</th>
                <th className="px-4 py-3 font-semibold text-ink/60">Photos</th>
                <th className="px-4 py-3 font-semibold text-ink/60">Joined</th>
                <th className="px-4 py-3 font-semibold text-ink/60">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-ink/[0.02]">
                  <td className="px-4 py-3 font-medium text-ink">{u.email}</td>
                  <td className="px-4 py-3 text-ink/70">
                    {u.profileName ?? <span className="text-ink/30 italic">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Badge
                        variant={
                          u.role === "SUPER_ADMIN"
                            ? "gold"
                            : u.role === "ADMIN"
                              ? "verified"
                              : "neutral"
                        }
                      >
                        {u.role}
                      </Badge>
                      {u.accountCategory && (
                        <Badge variant="neutral">{u.accountCategory}</Badge>
                      )}
                      {u.isPro && <Badge variant="gold">Pro</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {u.hasPhotos ? (
                      <CheckIcon width={16} height={16} className="text-success" />
                    ) : (
                      <span className="text-ink/30">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink/50">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {u.hasProfile && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPhotoTarget(u)}
                        >
                          Photos
                        </Button>
                      )}
                      {canResetPasswords && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setResetTarget(u)}
                        >
                          Reset password
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && <CreateProfileModal onClose={() => setCreating(false)} />}

      {resetTarget && (
        <ResetModal user={resetTarget} onClose={() => setResetTarget(null)} />
      )}

      {photoTarget && (
        <AdminPhotoUploadModal
          userId={photoTarget.id}
          label={photoTarget.profileName ?? photoTarget.email}
          onClose={() => setPhotoTarget(null)}
        />
      )}
    </div>
  );
}
