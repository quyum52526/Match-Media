export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getViewerId } from "@/lib/session";
import { getJobBoard } from "@/lib/data/jobs";
import { JobBoard } from "@/components/jobs/JobBoard";
import { Container } from "@/components/ui/Container";

export const metadata = {
  title: "Job Board · MatchMedia",
};

export default async function JobsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // ── Auth gate ────────────────────────────────────────────────────────────
  const viewerId = await getViewerId();
  if (!viewerId) {
    redirect(locale === "en" ? "/en/login" : "/login");
  }
  const userId = viewerId!;

  // ── Role gate: AGENT or ADMIN only ───────────────────────────────────────
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user?.role !== "AGENT" && user?.role !== "ADMIN") {
    redirect(locale === "en" ? "/en/dashboard" : "/dashboard");
  }

  const jobs = await getJobBoard(userId);

  return (
    <Container className="py-8 sm:py-12">
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
          Job Board
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Browse open verification jobs. Filter by district to find work near
          you, then submit your bid.
        </p>
      </header>

      <JobBoard jobs={jobs} />
    </Container>
  );
}
