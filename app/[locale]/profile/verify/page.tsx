import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireViewerId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { VerificationCenter } from "@/components/verification/VerificationCenter";
import { getFeatureFlags } from "@/lib/featureFlags";
import { Container } from "@/components/ui/Container";

export const metadata = {
  title: "Verification Center",
};

async function getUserVerificationState(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      isMobileVerified: true,
      mobile: true,
      email: true,
      isEmailVerified: true,
      nidVerificationStatus: true,
      nidReviewNote: true,
      selfieVerificationStatus: true,
      selfieReviewNote: true,
      agencyVerificationStatus: true,
      accountCategory: true,
    },
  });
}

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const userId = await requireViewerId(`/${locale}/login`);
  const [user, flags] = await Promise.all([
    getUserVerificationState(userId),
    getFeatureFlags(),
  ]);
  if (!user) redirect(`/${locale}/login`);

  return (
    <Container className="py-10">
      <div className="mx-auto max-w-2xl">
        <VerificationCenter
          user={user}
          nidEnabled={flags.ENABLE_NID_VERIFICATION}
          selfieEnabled={flags.ENABLE_SELFIE_VERIFICATION}
          emailEnabled={flags.ENABLE_EMAIL_OTP}
        />
      </div>
    </Container>
  );
}
