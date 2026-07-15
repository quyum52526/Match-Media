"use client";

import { useState, type InputHTMLAttributes } from "react";
import { useTranslations } from "next-intl";
import { EyeIcon, EyeOffIcon } from "@/components/ui/icons";

type PasswordInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  /** Extra classes for the <input> itself. */
  className?: string;
};

const baseInputClass =
  "h-11 w-full rounded-xl border border-hairline bg-white pl-3 pr-11 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";

export function PasswordInput({ className = "", ...props }: PasswordInputProps) {
  const t = useTranslations("Auth");
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`${baseInputClass} ${className}`.trim()}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t("hidePassword") : t("showPassword")}
        aria-pressed={visible}
        title={visible ? t("hidePassword") : t("showPassword")}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink/45 transition-colors hover:text-ink focus:outline-none focus-visible:text-primary"
        tabIndex={-1}
      >
        {visible ? (
          <EyeOffIcon width={18} height={18} />
        ) : (
          <EyeIcon width={18} height={18} />
        )}
      </button>
    </div>
  );
}
