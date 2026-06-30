import { setRequestLocale } from "next-intl/server";
import { assertAdmin } from "@/lib/session";
import { redirect } from "next/navigation";
import {
  getPendingNids,
  getPendingSelfies,
  getPendingAgencies,
} from "@/lib/data/adminVerifications";
import { AdminVerificationsHub } from "@/components/admin/AdminVerificationsHub";

export const metadata = {
  title: "Document Verifications · Admin · MatchMedia",
};

export default async function AdminVerificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const adminId = await assertAdmin();
  if (!adminId) redirect(`/${locale}/login`);

  const [pendingNids, pendingSelfies, pendingAgencies] = await Promise.all([
    getPendingNids(),
    getPendingSelfies(),
    getPendingAgencies(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Document Verifications</h1>
        <p className="mt-1 text-sm text-muted">
          Review user-submitted NID photos, selfies, and agency trade licenses.
        </p>
      </div>
      <AdminVerificationsHub
        pendingNids={pendingNids}
        pendingSelfies={pendingSelfies}
        pendingAgencies={pendingAgencies}
      />
    </div>
  );
}
