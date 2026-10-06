import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clock, Mail, MapPin, MessageCircle, ShieldCheck } from "lucide-react";
import { ContactForm } from "@/components/contact/ContactForm";
import { Card, CardBody } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";

export const metadata = {
  title: "Contact Us · MatchMedia",
};

const EMAIL = "info@matchmediabd.xyz";
const WHATSAPP_URL = "https://wa.me/8801962434901";

function ChannelRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {label}
        </p>
        <div className="mt-1 break-words text-sm font-medium text-ink">
          {children}
        </div>
      </div>
    </div>
  );
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Contact");
  const iconClass = "h-5 w-5";

  return (
    <Container className="py-10 sm:py-14">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          {t("intro")}
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Left: direct channels */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardBody>
              <h2 className="mb-5 font-display text-lg font-semibold text-ink">
                {t("channelsTitle")}
              </h2>
              <div className="divide-y divide-hairline">
                <ChannelRow icon={<Mail className={iconClass} />} label={t("emailLabel")}>
                  <a href={`mailto:${EMAIL}`} className="hover:text-primary hover:underline">
                    {t("email")}
                  </a>
                </ChannelRow>
                <ChannelRow
                  icon={<MessageCircle className={iconClass} />}
                  label={t("phoneLabel")}
                >
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 hover:text-primary hover:underline"
                  >
                    <span dir="ltr">{t("phone")}</span>
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                      WhatsApp
                    </span>
                  </a>
                </ChannelRow>
                <ChannelRow icon={<MapPin className={iconClass} />} label={t("addressLabel")}>
                  {t("address")}
                </ChannelRow>
                <ChannelRow icon={<Clock className={iconClass} />} label={t("hoursLabel")}>
                  {t("hours")}
                </ChannelRow>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-pill bg-success px-5 text-sm font-medium text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-success/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  {t("whatsappCta")}
                </a>
                <a
                  href={`mailto:${EMAIL}`}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-pill border border-primary px-5 text-sm font-medium text-primary transition-all duration-150 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  {t("emailCta")}
                </a>
              </div>
            </CardBody>
          </Card>

          <div className="flex items-start gap-3 rounded-card border border-success/20 bg-success/5 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-muted">{t("privacyNote")}</p>
          </div>
        </div>

        {/* Right: inquiry form */}
        <Card>
          <CardBody className="sm:p-8">
            <h2 className="font-display text-lg font-semibold text-ink">
              {t("formTitle")}
            </h2>
            <p className="mb-6 mt-1 text-sm text-muted">{t("formIntro")}</p>
            <ContactForm />
          </CardBody>
        </Card>
      </div>
    </Container>
  );
}
