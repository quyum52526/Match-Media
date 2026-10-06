"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { CircleCheck, Send } from "lucide-react";
import {
  sendContactMessage,
  type ContactCategory,
  type ContactFormState,
} from "@/lib/actions/contact";
import { Button } from "@/components/ui/Button";

const CATEGORIES: ContactCategory[] = ["general", "account", "agency", "verification"];

const fieldClass =
  "w-full rounded-xl border border-hairline bg-white px-3 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_30%,transparent)]";

export function ContactForm() {
  const t = useTranslations("Contact");
  const [state, formAction, pending] = useActionState<ContactFormState, FormData>(
    sendContactMessage,
    { status: "idle" },
  );

  if (state.status === "success") {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-3 rounded-card bg-[color-mix(in_srgb,var(--color-success)_12%,white)] px-6 py-10 text-center"
      >
        <CircleCheck className="h-10 w-10 text-success" aria-hidden="true" />
        <p className="text-sm font-medium text-ink">{t("success")}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {/* Honeypot: hidden from people, tempting to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="contact-company">Company</label>
        <input id="contact-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="contact-name" className="text-sm font-medium text-ink">
            {t("nameLabel")}
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            maxLength={100}
            autoComplete="name"
            className={`${fieldClass} h-11`}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="contact-email" className="text-sm font-medium text-ink">
            {t("emailFieldLabel")}
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            className={`${fieldClass} h-11`}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="contact-category" className="text-sm font-medium text-ink">
          {t("categoryLabel")}
        </label>
        <select
          id="contact-category"
          name="category"
          required
          defaultValue="general"
          className={`${fieldClass} h-11`}
        >
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {t(`categories.${category}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="contact-message" className="text-sm font-medium text-ink">
          {t("messageLabel")}
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          placeholder={t("messagePlaceholder")}
          className={`${fieldClass} resize-y py-2.5 leading-relaxed`}
        />
      </div>

      {state.status === "error" && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {state.error === "invalid" ? t("errorInvalid") : t("errorFailed")}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        fullWidth
        disabled={pending}
        className="hover:-translate-y-0.5 hover:shadow-md"
      >
        <Send className="h-4 w-4" aria-hidden="true" />
        {pending ? t("sending") : t("submit")}
      </Button>
    </form>
  );
}
