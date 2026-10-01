import { setRequestLocale } from "next-intl/server";
import { getAdminUsers } from "@/lib/data/admin";
import { isViewerSuperAdmin } from "@/lib/session";
import { UsersList } from "@/components/admin/UsersList";

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  // The /admin layout already gated this to ADMIN | SUPER_ADMIN; this only
  // decides whether the owner-only password-reset control is rendered.
  const [users, canResetPasswords] = await Promise.all([
    getAdminUsers(),
    isViewerSuperAdmin(),
  ]);
  return <UsersList users={users} canResetPasswords={canResetPasswords} />;
}
