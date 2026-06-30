"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveNid,
  rejectNid,
  approveSelfie,
  rejectSelfie,
  approveAgency,
  rejectAgency,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";
import { InboxIcon } from "@/components/ui/icons";
import type { PendingNid, PendingSelfie, PendingAgency } from "@/lib/data/adminVerifications";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function DocImage({ url, alt }: { url: string | null; alt: string }) {
  if (!url) {
    return (
      <div className="flex h-32 w-full items-center justify-center rounded-lg border border-dashed border-hairline bg-canvas text-xs text-muted">
        No image
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <a href={url} target="_blank" rel="noopener noreferrer" title="Open full size">
      <img
        src={url}
        alt={alt}
        className="h-32 w-full rounded-lg border border-hairline object-cover hover:opacity-90"
      />
    </a>
  );
}

function SectionHeader({
  title,
  count,
}: {
  title: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
        {count}
      </span>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-hairline bg-canvas py-8 text-center">
      <InboxIcon width={28} height={28} className="text-ink/20" />
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NID section
// ---------------------------------------------------------------------------

function NidRow({ item }: { item: PendingNid }) {
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function act(fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div className="rounded-card border border-hairline bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">{item.fullName ?? "—"}</p>
          <p className="text-xs text-muted">{item.email}</p>
        </div>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
          PENDING
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1 text-xs font-medium text-muted">Front</p>
          <DocImage url={item.nidFrontUrl} alt="NID front" />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-muted">Back</p>
          <DocImage url={item.nidBackUrl} alt="NID back" />
        </div>
      </div>

      <input
        type="text"
        placeholder="Rejection note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="mb-3 w-full rounded-lg border border-hairline px-3 py-1.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
      />

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="primary"
          className="flex-1 bg-success hover:bg-success/90"
          disabled={isPending}
          onClick={() => act(() => approveNid(item.userId))}
        >
          ✓ Approve NID
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
          disabled={isPending}
          onClick={() => act(() => rejectNid(item.userId, note))}
        >
          ✕ Reject
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Selfie section
// ---------------------------------------------------------------------------

function SelfieRow({ item }: { item: PendingSelfie }) {
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function act(fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div className="rounded-card border border-hairline bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">{item.fullName ?? "—"}</p>
          <p className="text-xs text-muted">{item.email}</p>
        </div>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
          PENDING
        </span>
      </div>

      <div className="mb-4">
        <p className="mb-1 text-xs font-medium text-muted">Live Selfie</p>
        <DocImage url={item.selfieUrl} alt="Live selfie" />
      </div>

      <input
        type="text"
        placeholder="Rejection note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="mb-3 w-full rounded-lg border border-hairline px-3 py-1.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
      />

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="primary"
          className="flex-1 bg-success hover:bg-success/90"
          disabled={isPending}
          onClick={() => act(() => approveSelfie(item.userId))}
        >
          ✓ Approve Selfie
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
          disabled={isPending}
          onClick={() => act(() => rejectSelfie(item.userId, note))}
        >
          ✕ Reject
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Agency section
// ---------------------------------------------------------------------------

function AgencyRow({ item }: { item: PendingAgency }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function act(fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div className="rounded-card border border-hairline bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">{item.agencyName ?? "—"}</p>
          <p className="text-xs text-muted">
            {item.contactPerson ? `${item.contactPerson} · ` : ""}
            {item.email}
          </p>
        </div>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
          PENDING
        </span>
      </div>

      <div className="mb-4">
        <p className="mb-1 text-xs font-medium text-muted">Trade License</p>
        <DocImage url={item.tradeLicenseUrl} alt="Trade license" />
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="primary"
          className="flex-1 bg-success hover:bg-success/90"
          disabled={isPending}
          onClick={() => act(() => approveAgency(item.userId))}
        >
          ✓ Approve Agency
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
          disabled={isPending}
          onClick={() => act(() => rejectAgency(item.userId))}
        >
          ✕ Reject
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hub
// ---------------------------------------------------------------------------

export function AdminVerificationsHub({
  pendingNids,
  pendingSelfies,
  pendingAgencies,
}: {
  pendingNids: PendingNid[];
  pendingSelfies: PendingSelfie[];
  pendingAgencies: PendingAgency[];
}) {
  return (
    <div className="space-y-10">
      {/* NID */}
      <section className="space-y-4">
        <SectionHeader title="NID Verification" count={pendingNids.length} />
        {pendingNids.length === 0 ? (
          <EmptyState label="No pending NID submissions" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {pendingNids.map((item) => (
              <NidRow key={item.userId} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* Selfie */}
      <section className="space-y-4">
        <SectionHeader title="Live Selfie Verification" count={pendingSelfies.length} />
        {pendingSelfies.length === 0 ? (
          <EmptyState label="No pending selfie submissions" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {pendingSelfies.map((item) => (
              <SelfieRow key={item.userId} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* Agency */}
      <section className="space-y-4">
        <SectionHeader title="Agency Trade License" count={pendingAgencies.length} />
        {pendingAgencies.length === 0 ? (
          <EmptyState label="No pending agency applications" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {pendingAgencies.map((item) => (
              <AgencyRow key={item.userId} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
