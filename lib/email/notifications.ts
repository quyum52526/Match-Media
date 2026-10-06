import "server-only";
import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { EMAIL_FROM, isEmailConfigured, sendEmail } from "@/lib/email/provider";
import { maskEmail } from "@/lib/privacy";

/**
 * Transactional emails for admin moderation decisions.
 *
 * Two entry points, both best-effort (they log and swallow every failure, so a
 * mail outage, a missing RESEND_API_KEY or a quota limit can never fail the
 * moderation action that triggered them):
 *
 *   - notify() in lib/notifications/dispatch.ts calls sendModerationEmail()
 *     after the in-app Notification row is committed, for the types below.
 *   - Agency trade-licence decisions have no NotificationType (and so no
 *     in-app row); lib/actions/admin.ts calls sendModerationEmail() directly
 *     with an AGENCY_* kind.
 *
 * Rejection reasons ARE included when the admin supplied one, so the member
 * knows what to fix without logging in. Keep that in mind when writing them:
 * User.email is collected at registration and is often unconfirmed
 * (isEmailVerified is false until the OTP flow runs), so a mistyped address
 * means a stranger reads the reason. Never put document details (NID numbers,
 * names on the card) in a reason.
 */

/** Every kind of moderation email: notification types plus agency outcomes. */
export type ModerationEmailKind =
  | NotificationType
  | "AGENCY_APPROVED"
  | "AGENCY_REJECTED"
  | "AGENCY_ROLE_APPROVED"
  | "AGENCY_ROLE_REJECTED"
  | "AGENT_ROLE_APPROVED"
  | "AGENT_ROLE_REJECTED";

type Status = "approved" | "rejected";

interface Copy {
  status: Status;
  subject: string;
  heading: string;
  body: string;
  cta: string;
  /** Default in-app route for the CTA when the caller passes no link. */
  link: string;
}

const COPY: Partial<Record<ModerationEmailKind, Copy>> = {
  PHOTO_APPROVED: {
    status: "approved",
    subject: "Your photo was approved",
    heading: "Your photo is approved",
    body: "Our moderation team reviewed your photo and it is now live on your profile, following your privacy settings.",
    cta: "View your profile",
    link: "/profile/edit",
  },
  PHOTO_REJECTED: {
    status: "rejected",
    subject: "Your photo needs another look",
    heading: "Your photo was not approved",
    body: "Our moderation team could not approve your latest photo. Please upload a replacement that follows our photo guidelines.",
    cta: "Update your photo",
    link: "/profile/edit",
  },
  VERIFIED_BADGE: {
    status: "approved",
    subject: "You are now verified",
    heading: "You are verified",
    body: "Your Verified badge is now showing on your profile. It tells other members that your identity has been checked by our team.",
    cta: "View your profile",
    link: "/profile/edit",
  },
  NID_APPROVED: {
    status: "approved",
    subject: "Your NID check is complete",
    heading: "Your NID was approved",
    body: "Your national ID submission passed review. If a selfie check is still outstanding, completing it will grant your Verified badge.",
    cta: "Open verification",
    link: "/profile/verify",
  },
  NID_REJECTED: {
    status: "rejected",
    subject: "Your NID submission needs attention",
    heading: "Your NID was not approved",
    body: "Our team could not approve your national ID submission. Please check the details below and submit again.",
    cta: "Open verification",
    link: "/profile/verify",
  },
  SELFIE_APPROVED: {
    status: "approved",
    subject: "Your selfie check is complete",
    heading: "Your selfie was approved",
    body: "Your selfie passed our face-match review. If an NID check is still outstanding, completing it will grant your Verified badge.",
    cta: "Open verification",
    link: "/profile/verify",
  },
  SELFIE_REJECTED: {
    status: "rejected",
    subject: "Your selfie needs attention",
    heading: "Your selfie was not approved",
    body: "Our team could not approve your selfie. Please check the details below and try again.",
    cta: "Open verification",
    link: "/profile/verify",
  },
  AGENCY_APPROVED: {
    status: "approved",
    subject: "Your agency is verified",
    heading: "Your trade licence was approved",
    body: "Your agency's trade licence passed review and your agency account is now verified.",
    cta: "Open your dashboard",
    link: "/dashboard",
  },
  AGENCY_REJECTED: {
    status: "rejected",
    subject: "Your trade licence needs attention",
    heading: "Your trade licence was not approved",
    body: "Our team could not approve your agency's trade licence. Please check the details below and upload it again.",
    cta: "Open your dashboard",
    link: "/profile/edit",
  },
  // Role applications: a member who asked to ALSO operate as an agency or an
  // agent from their existing account. Distinct from the AGENCY_* pair above,
  // which is about the trade licence of an agency that already operates.
  AGENCY_ROLE_APPROVED: {
    status: "approved",
    subject: "Your agency account is approved",
    heading: "Your agency is approved",
    body: "Your marriage media application passed review. Switch to your agency from the menu in the top right to start adding client profiles — your personal profile stays exactly as it is.",
    cta: "Open your agency dashboard",
    link: "/agency/dashboard",
  },
  AGENCY_ROLE_REJECTED: {
    status: "rejected",
    subject: "Your agency application was not approved",
    heading: "Your agency application was not approved",
    body: "Our team reviewed your marriage media application and could not approve it. You can apply again once the point below is addressed.",
    cta: "Review your application",
    link: "/profile/expand",
  },
  AGENT_ROLE_APPROVED: {
    status: "approved",
    subject: "You are approved as a verification agent",
    heading: "Your agent account is approved",
    body: "Your verification agent application passed review. Switch to the agent view from the menu in the top right to see assignments in the districts you cover.",
    cta: "Open your agent dashboard",
    link: "/agent/dashboard",
  },
  AGENT_ROLE_REJECTED: {
    status: "rejected",
    subject: "Your agent application was not approved",
    heading: "Your agent application was not approved",
    body: "Our team reviewed your verification agent application and could not approve it. You can apply again once the point below is addressed.",
    cta: "Review your application",
    link: "/profile/expand",
  },
};

/** Production site; used when APP_URL is not configured. */
const DEFAULT_APP_URL = "https://www.matchmediabd.xyz";

/** Absolute base URL for CTA buttons and image assets. */
export function appBaseUrl(): string {
  const raw = process.env.APP_URL?.trim();
  return (raw || DEFAULT_APP_URL).replace(/\/+$/, "");
}

const BRAND = {
  primary: "#8c2f4a",
  primaryDark: "#5e1e31",
  accent: "#c8a24b",
  bg: "#fbf7f2",
  ink: "#241f26",
  muted: "#686470",
  hairline: "#ece6de",
  success: "#2e7d5b",
  danger: "#b42318",
};

const BADGE: Record<Status, { label: string; fg: string; bg: string }> = {
  approved: { label: "Approved", fg: BRAND.success, bg: "#e6f2ec" },
  rejected: { label: "Not approved", fg: BRAND.danger, bg: "#fdecea" },
};

/** Admin-typed text goes into HTML, so it must be escaped. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface EmailBody {
  subject: string;
  html: string;
  text: string;
}

export interface ModerationEmailOptions {
  /** In-app route for the CTA; defaults to the kind's own route. */
  link?: string | null;
  /** Admin-supplied rejection reason / review note, shown when present. */
  reason?: string | null;
}

/** Build the email for a kind, or null if that kind stays in-app only. */
export function moderationEmail(
  kind: ModerationEmailKind,
  options: ModerationEmailOptions = {},
): EmailBody | null {
  const copy = COPY[kind];
  if (!copy) return null;

  const base = appBaseUrl();
  const path = options.link || copy.link;
  const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  // Dark-on-light wordmark (the header is white). Spaces in the filename are
  // percent-encoded so every mail client resolves it.
  const logoUrl = `${base}/${encodeURIComponent("MM Match Media Logo-02.png")}`;
  const badge = BADGE[copy.status];
  const reason = copy.status === "rejected" ? options.reason?.trim() || null : null;

  const text =
    `${copy.heading}\n\n${copy.body}\n\n` +
    (reason ? `Reason from our team: ${reason}\n\n` : "") +
    `${copy.cta}: ${url}\n\n` +
    `— Match Media\n${base}\n\nYou are receiving this because of activity on your Match Media account.`;

  const reasonBlock = reason
    ? `<tr><td style="padding:0 32px 20px">
        <div style="border-left:3px solid ${BRAND.accent};background:${BRAND.bg};border-radius:8px;padding:12px 14px">
          <p style="margin:0 0 4px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:${BRAND.muted}">Reason from our team</p>
          <p style="margin:0;font-size:14px;line-height:1.6;color:${BRAND.ink};white-space:pre-line">${escapeHtml(reason)}</p>
        </div>
      </td></tr>`
    : "";

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(copy.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:${BRAND.ink}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg}">
  <tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid ${BRAND.hairline};border-radius:16px;overflow:hidden">
      <tr><td style="height:4px;line-height:4px;font-size:0;background:${BRAND.primary}">&nbsp;</td></tr>
      <tr><td style="padding:22px 32px 6px;border-bottom:1px solid ${BRAND.hairline}">
        <a href="${base}" style="text-decoration:none">
          <img src="${logoUrl}" alt="Match Media" width="180" style="display:block;width:180px;max-width:100%;height:auto;border:0;margin-bottom:16px">
        </a>
      </td></tr>
      <tr><td style="padding:28px 32px 8px">
        <span style="display:inline-block;padding:4px 12px;border-radius:999px;background:${badge.bg};color:${badge.fg};font-size:12px;font-weight:700;letter-spacing:.04em">${badge.label}</span>
        <h1 style="margin:14px 0 10px;font-size:21px;line-height:1.3;font-weight:700;color:${BRAND.ink}">${escapeHtml(copy.heading)}</h1>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:${BRAND.muted}">${escapeHtml(copy.body)}</p>
      </td></tr>
      ${reasonBlock}
      <tr><td style="padding:0 32px 28px">
        <a href="${url}" style="display:inline-block;background:${BRAND.primary};color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 24px;border-radius:999px">${escapeHtml(copy.cta)}</a>
      </td></tr>
      <tr><td style="padding:16px 32px;border-top:1px solid ${BRAND.hairline};background:${BRAND.bg}">
        <p style="margin:0;font-size:12px;line-height:1.6;color:${BRAND.muted}">You are receiving this because of activity on your Match Media account.<br>
        <a href="${base}" style="color:${BRAND.primaryDark};text-decoration:none">${base.replace(/^https?:\/\//, "")}</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  return { subject: `${copy.subject} · Match Media`, html, text };
}

/** True when this kind has an email; lets callers skip the address lookup. */
export function hasModerationEmail(kind: ModerationEmailKind): boolean {
  return Boolean(COPY[kind]);
}

/**
 * Look up the user's registered email and send the moderation email for
 * `kind`. Never throws: every failure is logged and swallowed, because the
 * moderation decision is already committed and must stand regardless.
 */
export async function sendModerationEmail(
  userId: string,
  kind: ModerationEmailKind,
  options: ModerationEmailOptions = {},
): Promise<void> {
  try {
    const body = moderationEmail(kind, options);
    if (!body) return;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    const to = user?.email?.trim();
    if (!to) {
      console.warn(`[email] skipped kind=${kind} user=${userId}: no email on file`);
      return;
    }

    // Addresses are masked in logs — they are personal data.
    const who = `kind=${kind} user=${userId} to=${maskEmail(to)}`;
    console.info(`[email] queued ${who}`);
    const sent = await sendEmail({ to, ...body });
    if (sent) {
      // Without RESEND_API_KEY the provider only prints the email to the
      // console, so say so rather than claim a delivery.
      const via = isEmailConfigured() ? "resend" : "console (RESEND_API_KEY not set)";
      console.info(`[email] sent ${who} via=${via}`);
    } else {
      // Not retried: the member still has the in-app notification (or, for
      // agencies, the status on their dashboard).
      console.warn(`[email] not delivered ${who}`);
    }
  } catch (error) {
    console.error(`[email] failed kind=${kind} user=${userId}`, error);
  }
}

/** Exposed so a future preference screen can list what we email about. */
export const EMAILED_KINDS = Object.keys(COPY) as ModerationEmailKind[];

// Re-exported for callers that log which sender was used.
export { EMAIL_FROM };
