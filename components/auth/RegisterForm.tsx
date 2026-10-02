"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { register, type RegistrationCategory } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Building2, ShieldCheck, User, Users } from "lucide-react";
import { DISTRICTS } from "@/lib/constants/bdGeo";
import { localize } from "@/lib/constants/labels";
import { InfoTipBubble, InfoTipButton } from "@/components/ui/InfoTip";
import { cn } from "@/lib/utils";

const inputClass =
  "h-11 w-full rounded-xl border border-hairline bg-white px-3 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";

function Req() {
  return <span className="text-red-500"> *</span>;
}

/**
 * The account types selectable at signup, in display order. Kept in sync with
 * REGISTRABLE_CATEGORIES in lib/actions/auth.ts — that is the authority, this is
 * only what the form offers.
 */
const CATEGORIES: readonly RegistrationCategory[] = [
  "SELF",
  "PARENTS",
  "MEDIA",
  "AGENT",
];

/** One glyph per account type. Sized at the call site. */
const CATEGORY_ICON: Record<
  RegistrationCategory,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  SELF: User,
  PARENTS: Users,
  MEDIA: Building2,
  AGENT: ShieldCheck,
};

/** Default selection. A constant (not derived state) so SSR and hydration agree. */
const DEFAULT_CATEGORY: RegistrationCategory = "SELF";

/** How long a tapped tooltip stays up on touch, where nothing un-hovers it. */
const TAP_HOLD_MS = 3000;

export function RegisterForm() {
  const t = useTranslations("Auth.register");
  const locale = useLocale();
  const [error, formAction, pending] = useActionState(register, undefined);
  const [category, setCategory] = useState<RegistrationCategory>(DEFAULT_CATEGORY);

  // Which card's description is showing. Hover/focus anywhere on a card opens
  // it; on touch there is no hover, so tapping (i) opens it and it auto-closes
  // after TAP_HOLD_MS (a tap leaves nothing to "un-hover").
  const [openTip, setOpenTip] = useState<RegistrationCategory | null>(null);
  const tipIdPrefix = useId();
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTapTimer() {
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
      tapTimer.current = null;
    }
  }

  /** Hover/focus: show immediately, and cancel any pending tap dismissal. */
  function showTip(id: RegistrationCategory) {
    clearTapTimer();
    setOpenTip(id);
  }

  function hideTip(id: RegistrationCategory) {
    clearTapTimer();
    // Only close if this card still owns the tooltip, so a fast move between
    // cards cannot close the one that just opened.
    setOpenTip((current) => (current === id ? null : current));
  }

  /**
   * Pressing the (i). Opens rather than toggles — deliberately.
   *
   * A toggle is unusable here: focus fires BEFORE click, so `onFocus` would open
   * the tooltip and the click would immediately close it again, making the button
   * look dead. Opening is idempotent and sidesteps the ordering entirely.
   *
   * On a touch device nothing will ever un-hover the card, so the tooltip
   * self-dismisses after TAP_HOLD_MS. On a device that genuinely has hover,
   * leaving the card already closes it, so no timer is armed — otherwise the
   * tooltip would vanish after 3s while the pointer was still resting on it.
   */
  function pinTip(id: RegistrationCategory) {
    clearTapTimer();
    setOpenTip(id);
    const hasHover =
      typeof window !== "undefined" &&
      window.matchMedia?.("(hover: hover)").matches;
    if (!hasHover) {
      tapTimer.current = setTimeout(() => setOpenTip(null), TAP_HOLD_MS);
    }
  }

  // Escape closes, and the timer must not outlive the component.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        clearTapTimer();
        setOpenTip(null);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTapTimer();
    };
  }, []);

  const isSelf = category === "SELF";
  const isParents = category === "PARENTS";
  const isMedia = category === "MEDIA";
  const isAgent = category === "AGENT";

  // Whose name the name field asks for: the guardian, the agent, or the
  // candidate. MEDIA asks for an agency + contact person instead.
  const nameRequired = isParents || isAgent;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />

      {/* ---------- Account type ---------- */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-ink">
          {t("accountType.label")}
          <Req />
        </legend>
        <p className="text-xs text-ink/50">{t("accountType.hint")}</p>

        {/* Real radios styled as cards: keyboard and screen-reader behaviour
            come for free, and the value still posts without JS.
            2x2 on mobile, 4 across from sm up. Descriptions live in the InfoTip
            rather than inline, so the cards stay compact and equal height. */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CATEGORIES.map((id) => {
            const selected = category === id;
            const Icon = CATEGORY_ICON[id];
            const title = t(`accountType.options.${id}.title`);
            const tipId = `${tipIdPrefix}-${id}`;
            const tipOpen = openTip === id;
            return (
              <label
                key={id}
                // The WHOLE card is the tooltip trigger, not just the (i) icon.
                // onFocus/onBlur cover keyboard users: React's focus events
                // bubble, so tabbing to the radio inside opens the tooltip too.
                onMouseEnter={() => showTip(id)}
                onMouseLeave={() => hideTip(id)}
                onFocus={() => showTip(id)}
                onBlur={() => hideTip(id)}
                className={cn(
                  // `relative` anchors the bubble to the CARD (centred), while
                  // the (i) button pins itself to the corner. No overflow
                  // clipping here or on any ancestor, so the bubble can escape
                  // the card and float over the row below it.
                  "relative flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 px-2 pb-3 pt-4 text-center transition-colors",
                  "focus-within:ring-2 focus-within:ring-primary/30",
                  selected
                    ? "border-primary bg-primary/[0.04]"
                    : "border-hairline bg-white hover:border-primary/40",
                )}
              >
                <input
                  type="radio"
                  name="accountCategory"
                  value={id}
                  checked={selected}
                  onChange={() => setCategory(id)}
                  className="sr-only"
                />

                {/* Pinned to the corner so it never shifts the card contents. */}
                <InfoTipButton
                  label={t("accountType.aboutOption", { option: title })}
                  open={tipOpen}
                  onPress={() => pinTip(id)}
                  describedById={tipId}
                  className="absolute right-1 top-1"
                />

                <Icon
                  size={22}
                  className={cn(
                    "shrink-0 transition-colors",
                    selected ? "text-primary" : "text-ink/45",
                  )}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    "text-xs font-semibold leading-snug sm:text-sm",
                    selected ? "text-primary" : "text-ink",
                  )}
                >
                  {title}
                </span>

                {tipOpen && (
                  <InfoTipBubble
                    id={tipId}
                    text={t(`accountType.options.${id}.description`)}
                  />
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      {isAgent && (
        <p className="rounded-xl border border-hairline bg-canvas px-3 py-2 text-xs leading-relaxed text-ink/70">
          {t("accountType.agentNotice")}
        </p>
      )}

      {/* ---------- Identity: varies by account type ---------- */}
      {isMedia ? (
        <>
          <div className="space-y-1">
            <label htmlFor="agencyName" className="text-sm font-medium text-ink">
              {t("agencyName")}
              <Req />
            </label>
            <input
              id="agencyName"
              name="agencyName"
              type="text"
              required
              autoComplete="organization"
              className={inputClass}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="contactPerson" className="text-sm font-medium text-ink">
              {t("contactPerson")}
              <Req />
            </label>
            <input
              id="contactPerson"
              name="contactPerson"
              type="text"
              required
              autoComplete="name"
              className={inputClass}
            />
          </div>
        </>
      ) : (
        <div className="space-y-1">
          <label htmlFor="fullName" className="text-sm font-medium text-ink">
            {isParents ? t("guardianName") : t("fullName")}
            {/* Required for a guardian and an agent — it is the identity on the
                account, and neither gets a Profile row to hold a name. Optional
                for a candidate, who may prefer to stay unnamed until matched. */}
            {nameRequired ? (
              <Req />
            ) : (
              <>
                {" "}
                <span className="font-normal text-ink/40">({t("optional")})</span>
              </>
            )}
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required={nameRequired}
            autoComplete="name"
            className={inputClass}
          />
          {isParents && (
            <p className="text-xs text-ink/50">{t("guardianNameHint")}</p>
          )}
        </div>
      )}

      {isAgent && (
        <div className="space-y-1">
          <label htmlFor="district" className="text-sm font-medium text-ink">
            {t("district")}
            <Req />
          </label>
          <select
            id="district"
            name="district"
            required
            defaultValue=""
            className={inputClass}
            aria-describedby="district-hint"
          >
            <option value="" disabled>
              {t("districtPlaceholder")}
            </option>
            {DISTRICTS.map((d) => (
              <option key={d.value} value={d.value}>
                {localize(d.value, locale)}
              </option>
            ))}
          </select>
          <p id="district-hint" className="text-xs text-ink/50">
            {t("districtHint")}
          </p>
        </div>
      )}

      {/* ---------- Shared credentials ----------
          Kept mounted across every account type so switching the selector never
          discards what has already been typed. */}
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium text-ink">
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
        <label htmlFor="mobile" className="text-sm font-medium text-ink">
          {t("mobile")}
          <Req />
        </label>
        <input
          id="mobile"
          name="mobile"
          type="tel"
          inputMode="tel"
          required
          // Accepts 01XXXXXXXXX with an optional 88 / +88 country prefix, the
          // same shape normalizeBdMobile() enforces server-side. The browser
          // check is a courtesy; the server re-validates every submission.
          pattern="(?:\+?88)?01[3-9][0-9]{8}"
          title={t("errors.MOBILE")}
          autoComplete="tel"
          placeholder="01XXXXXXXXX"
          className={`${inputClass} font-body`}
        />
        <p className="font-body text-xs text-ink/50">
          {t("mobileHintRequired")}
        </p>
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium text-ink">
          {t("password")}
          <Req />
        </label>
        <PasswordInput
          id="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          aria-describedby="password-hint"
        />
        <p id="password-hint" className="font-body text-xs text-ink/50">
          {t("passwordHint")}
        </p>
      </div>

      {/* ---------- Candidate-only: gender + date of birth ----------
          Both are NOT NULL on Profile, so they are mandatory for SELF and
          irrelevant to the other types (which get no Profile row at all). */}
      {isSelf && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="gender" className="text-sm font-medium text-ink">
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
              <option value="Male">{t("genderMale")}</option>
              <option value="Female">{t("genderFemale")}</option>
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="dateOfBirth" className="text-sm font-medium text-ink">
              {t("dateOfBirth")}
              <Req />
            </label>
            <input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              required
              className={`${inputClass} font-body`}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm font-medium text-red-600">{t(`errors.${error}`)}</p>
      )}

      <Button type="submit" fullWidth disabled={pending}>
        {pending ? t("submitting") : t("submit")}
      </Button>

      <p className="text-center text-xs text-ink/50">{t("privacyNote")}</p>
    </form>
  );
}
