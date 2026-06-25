import { getTranslations } from "next-intl/server";
import {
  EyeIcon,
  HeartIcon,
  ChatIcon,
  ShieldCheckIcon,
  LockIcon,
  CheckIcon,
} from "@/components/ui/icons";

/**
 * "How It Works / Trust & Safety" band — Brand v1.0. A 3-step, privacy-first
 * funnel explainer on the Ivory canvas. Garnet (primary) step accents, Success-
 * green trust signals, surface cards with hairline borders + card radius +
 * shadow-card, Tailwind-only hover lift. Server component.
 */
export async function HowItWorks() {
  const t = await getTranslations("Home.howItWorks");

  const steps = [
    { n: 1, Icon: EyeIcon, title: t("step1Title"), body: t("step1Body") },
    { n: 2, Icon: HeartIcon, title: t("step2Title"), body: t("step2Body") },
    { n: 3, Icon: ChatIcon, title: t("step3Title"), body: t("step3Body") },
  ];

  const signals = [
    { Icon: ShieldCheckIcon, label: t("trust.verified") },
    { Icon: LockIcon, label: t("trust.consent") },
    { Icon: CheckIcon, label: t("trust.moderated") },
  ];

  return (
    <section className="bg-canvas antialiased">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        {/* Heading */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-medium tracking-tight text-ink sm:text-3xl">
            {t("title")}
          </h2>
          <p className="mt-3 text-base font-normal text-ink/60">
            {t("subtitle")}
          </p>
        </div>

        {/* 3 steps */}
        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map(({ n, Icon, title, body }) => (
            <li
              key={n}
              className="group rounded-card border border-hairline bg-surface p-6 shadow-card transition-all duration-150 ease-in-out hover:-translate-y-1 hover:shadow-md"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors duration-150 ease-in-out group-hover:bg-primary/15">
                <Icon width={22} height={22} />
              </span>
              <p className="mt-4 font-body text-xs font-medium uppercase tracking-wide text-primary">
                {t("stepLabel", { n: String(n) })}
              </p>
              <h3 className="mt-1 text-base font-medium text-ink">{title}</h3>
              <p className="mt-2 text-sm font-normal leading-relaxed text-ink/60">
                {body}
              </p>
            </li>
          ))}
        </ol>

        {/* Trust signals */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
          {signals.map(({ Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-2 text-sm font-normal text-ink/70"
            >
              <span className="text-success">
                <Icon width={18} height={18} />
              </span>
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
