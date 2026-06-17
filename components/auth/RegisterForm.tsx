"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { register } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";

const inputClass =
  "h-11 w-full rounded-xl border border-charcoal/15 bg-white px-3 text-sm text-charcoal outline-none focus:border-trustGreen focus:ring-2 focus:ring-trustGreen/30";

export function RegisterForm() {
  const t = useTranslations("Auth.register");
  const [error, formAction, pending] = useActionState(register, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="fullName" className="text-sm font-medium text-charcoal">
          {t("fullName")}
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
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="gender" className="text-sm font-medium text-charcoal">
            {t("gender")}
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
        {t("submit")}
      </Button>
    </form>
  );
}
