import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = {
  title: "Log in · MatchMedia",
};

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <h1 className="mb-6 text-center text-2xl font-bold text-ink">
        {t("title")}
      </h1>
      <Card>
        <CardBody>
          <LoginForm />
        </CardBody>
      </Card>
      <p className="mt-4 text-center text-sm text-ink/60">
        {t("noAccount")}{" "}
        <Link
          href="/register"
          className="font-medium text-primary hover:underline"
        >
          {t("registerLink")}
        </Link>
      </p>
    </main>
  );
}
