import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata = {
  title: "Create account · MatchMedia",
};

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth.register");

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <h1 className="text-center text-2xl font-bold text-charcoal">
        {t("title")}
      </h1>
      <p className="mb-6 mt-2 text-center text-sm text-charcoal/60">
        {t("subtitle")}
      </p>
      <Card>
        <CardBody>
          <RegisterForm />
        </CardBody>
      </Card>
      <p className="mt-4 text-center text-sm text-charcoal/60">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-medium text-trustGreen hover:underline">
          {t("loginLink")}
        </Link>
      </p>
    </main>
  );
}
