"use client";

import { useActionState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { register } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";

const inputClass =
  "h-11 w-full rounded-xl border border-charcoal/15 bg-white px-3 text-sm text-charcoal outline-none focus:border-trustGreen focus:ring-2 focus:ring-trustGreen/30";

/** Red asterisk marking a required field. */
function Req() {
  return <span className="text-red-500"> *</span>;
}

export function RegisterForm() {
  const t = useTranslations("Auth.register");
  const locale = useLocale();
  const [error, formAction, pending] = useActionState(register, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {/* Keep the user in their language after the post-signup redirect. */}
      <input type="hidden" name="locale" value={locale} />

      <div className="space-y-1">
        <label htmlFor="fullName" className="text-sm font-medium text-charcoal">
          {t("fullName")}{" "}
          <span className="font-normal text-charcoal/40">
            ({t("optional")})
          </span>
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium text-charcoal">
          {t("email")}
          <Req />
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium text-charcoal">
          {t("password")}
          <Req />
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          aria-describedby="password-hint"
          className={inputClass}
        />
        <p id="password-hint" className="font-sans text-xs text-charcoal/50">
          {t("passwordHint")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="gender" className="text-sm font-medium text-charcoal">
            {t("gender")}
            <Req />
          </label>
          <select
            id="gender"
            name="gender"
            required
            defaultValue=""
            className={inputClass}
          >
            <option value="" disabled>
              {t("genderPlaceholder")}
            </option>
            {/* Canonical value is English; label follows the locale */}
            <option value="Male">{t("genderMale")}</option>
            <option value="Female">{t("genderFemale")}</option>
          </select>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="dateOfBirth"
            className="text-sm font-medium text-charcoal"
          >
            {t("dateOfBirth")}
            <Req />
          </label>
          <input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            required
            className={`${inputClass} font-sans`}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm font-medium text-red-600">{t(`errors.${error}`)}</p>
      )}

      <Button type="submit" fullWidth disabled={pending}>
        {pending ? t("submitting") : t("submit")}
      </Button>

      <p className="text-center text-xs text-charcoal/50">{t("privacyNote")}</p>
    </form>
  );
}
