import { setRequestLocale } from "next-intl/server";
import { ReportsQueue } from "@/components/admin/ReportsQueue";
import { getOpenReports } from "@/lib/data/admin";

export default async function AdminReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const reports = await getOpenReports();
  return <ReportsQueue reports={reports} />;
}
