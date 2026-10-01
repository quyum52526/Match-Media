import "server-only";
import type { NotificationType } from "@prisma/client";
import { EMAIL_FROM } from "@/lib/email/provider";

/**
 * Email bodies for the moderation outcomes worth leaving the app for.
 *
 * WHAT IS DELIBERATELY NOT IN THESE EMAILS:
 *
 *   - The admin's rejection reason / review note. That text is free-form and
 *     may be blunt or quote sensitive detail; it belongs behind a login, where
 *     the in-app notification already links to it.
 *   - Anything about the document itself (NID numbers, images, names).
 *
 * The reason is the delivery address. `User.email` is collected at registration
 * and most accounts have never confirmed it (isEmailVerified is false until the
 * OTP flow runs), so a typo means these land in a stranger's inbox. Keeping the
 * body to "a decision was made, open the app" bounds that exposure to the fact
 * that an account exists — while still doing the job of pulling the member back
 * to a queue that is waiting on them.
 *
 * Returns null for every type that stays in-app only. notify() checks that
 * BEFORE it looks up an address, so an in-app-only notification costs no query.
 */

interface EmailBody {
  subject: string;
  html: string;
  text: string;
}

interface Copy {
  subject: string;
  heading: string;
  body: string;
  /** Call-to-action label; omitted when there is nothing for them to do. */
  cta?: string;
}

const COPY: Partial<Record<NotificationType, Copy>> = {
  PHOTO_APPROVED: {
    subject: "Your photo was approved",
    heading: "Your photo is approved",
    body: "Our moderation team reviewed your photo and it is now live on your profile, following your privacy settings.",
    cta: "View your profile",
  },
  PHOTO_REJECTED: {
    subject: "Your photo needs another look",
    heading: "Your photo was not approved",
    body: "Our moderation team could not approve your latest photo. Open your profile to see the reason and upload a replacement.",
    cta: "Update your photo",
  },
  VERIFIED_BADGE: {
    subject: "You are now verified",
    heading: "You are verified",
    body: "Your Verified badge is now showing on your profile. It tells other members that your identity has been checked by our team.",
    cta: "View your profile",
  },
  NID_APPROVED: {
    subject: "Your NID check is complete",
    heading: "Your NID was approved",
    body: "Your national ID submission passed review. If a selfie check is still outstanding, completing it will grant your Verified badge.",
    cta: "Open verification",
  },
  NID_REJECTED: {
    subject: "Your NID submission needs attention",
    heading: "Your NID was not approved",
    body: "Our team could not approve your national ID submission. Open the verification page to see what is needed and submit again.",
    cta: "Open verification",
  },
  SELFIE_APPROVED: {
    subject: "Your selfie check is complete",
    heading: "Your selfie was approved",
    body: "Your selfie passed our face-match review. If an NID check is still outstanding, completing it will grant your Verified badge.",
    cta: "Open verification",
  },
  SELFIE_REJECTED: {
    subject: "Your selfie needs attention",
    heading: "Your selfie was not approved",
    body: "Our team could not approve your selfie. Open the verification page to see what is needed and try again.",
    cta: "Open verification",
  },
};

/** Absolute base URL for links, or null when APP_URL is unset (dev/CI). */
function baseUrl(): string | null {
  const raw = process.env.APP_URL?.trim();
  return raw ? raw.replace(/\/$/, "") : null;
}

/**
 * Build the email for a notification type, or null if that type is in-app only.
 *
 * `link` is the in-app route the notification points at; it becomes a button
 * only when APP_URL is configured, because a relative href in an email is dead.
 */
export function notificationEmail(
  type: NotificationType,
  link?: string | null,
): EmailBody | null {
  const copy = COPY[type];
  if (!copy) return null;

  const base = baseUrl();
  const url = base && link ? `${base}${link.startsWith("/") ? "" : "/"}${link}` : base;
  const showCta = Boolean(copy.cta && url);

  const text =
    `${copy.heading}\n\n${copy.body}\n\n` +
    (showCta ? `${copy.cta}: ${url}\n\n` : "") +
    `— MatchMedia\n\nYou are receiving this because of activity on your MatchMedia account.`;

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#faf7f2;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#2b2b2b">
  <div style="max-width:440px;margin:0 auto;background:#fff;border:1px solid #ece7df;border-radius:14px;padding:28px">
    <p style="margin:0 0 6px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#7f1a4b;font-weight:600">MatchMedia</p>
    <h1 style="margin:0 0 14px;font-size:19px;font-weight:700">${copy.heading}</h1>
    <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#5c5c5c">${copy.body}</p>
    ${
      showCta
        ? `<p style="margin:0 0 18px"><a href="${url}" style="display:inline-block;background:#7f1a4b;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:999px">${copy.cta}</a></p>`
        : ""
    }
    <p style="margin:0;font-size:12px;line-height:1.6;color:#8a8a8a">You are receiving this because of activity on your MatchMedia account.</p>
  </div>
</body></html>`;

  return { subject: `${copy.subject} · MatchMedia`, html, text };
}

/** Exposed so a future preference screen can list what we email about. */
export const EMAILED_NOTIFICATION_TYPES = Object.keys(COPY) as NotificationType[];

// Re-exported for callers that log which sender was used.
export { EMAIL_FROM };
