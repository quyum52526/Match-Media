import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { getViewerId } from "@/lib/session";
import { Card, CardBody } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { VerifyMobileForm } from "@/components/auth/VerifyMobileForm";

export const metadata = {
  title: "Verify your mobile · MatchMedia",
};

export default async function VerifyMobilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const viewerId = await getViewerId();
  if (!viewerId) redirect({ href: "/login", locale });

  const user = await prisma.user.findUnique({
    where: { id: viewerId! },
    select: { mobile: true, isMobileVerified: true },
  });
  // Already verified — nothing to do here.
  if (user?.isMobileVerified) redirect({ href: "/", locale });

  const t = await getTranslations("VerifyMobile");

  return (
    <Container className="flex min-h-[70vh] flex-col justify-center py-10">
      <div className="mx-auto w-full max-w-md">
      <h1 className="text-center text-2xl font-bold text-ink">
        {t("title")}
      </h1>
      <p className="mb-6 mt-2 text-center text-sm text-ink/60">
        {t("subtitle")}
      </p>
      <Card>
        <CardBody>
          <VerifyMobileForm mobile={user?.mobile ?? null} />
        </CardBody>
      </Card>
      </div>
    </Container>
  );
}
