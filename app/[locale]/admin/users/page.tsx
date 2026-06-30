import { setRequestLocale } from "next-intl/server";
import { getAdminUsers } from "@/lib/data/admin";
import { UsersList } from "@/components/admin/UsersList";

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const users = await getAdminUsers();
  return <UsersList users={users} />;
}
