import "server-only";
import { Resend } from "resend";

/**
 * Transactional email via Resend.
 *
 * Mirrors lib/sms/index.ts: the app talks to `sendEmail`, and the provider is
 * chosen from env so the whole flow runs uncredentialed in development. Without
 * RESEND_API_KEY the message is logged to the server console (including the OTP)
 * instead of being sent, so email verification is testable locally with no
 * account and no spend.
 */

export const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "MatchMedia <onboarding@resend.dev>";

let cached: Resend | null | undefined;

/** Lazily construct the client so a missing key never breaks the build. */
function getResend(): Resend | null {
  if (cached !== undefined) return cached;
  const key = process.env.RESEND_API_KEY;
  cached = key ? new Resend(key) : null;
  return cached;
}

/** True when real email can actually be delivered. */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Send one transactional email. Returns false on failure rather than throwing —
 * callers treat email as best-effort and must not fail a user action because a
 * mail provider had a bad minute.
 */
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const resend = getResend();

  if (!resend) {
    // Dev fallback: no key configured. Log so the code is recoverable locally.
    console.info(
      `[email:dev] to=${input.to} subject="${input.subject}"\n${input.text}`,
    );
    return true;
  }

  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    if (error) {
      console.error("resend send failed", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("resend threw", error);
    return false;
  }
}

/**
 * OTP email body. Plain-text is sent alongside the HTML because some Bangladeshi
 * mail clients and SMS-to-email gateways render text only, and a verification
 * code is exactly the content that must never be lost to a stripped-out layout.
 */
export function otpEmail(code: string, minutes: number): {
  subject: string;
  html: string;
  text: string;
} {
  return {
    subject: `${code} is your MatchMedia verification code`,
    text:
      `Your MatchMedia verification code is ${code}.\n\n` +
      `It expires in ${minutes} minutes. If you did not request it, ignore this email.`,
    html: `<!doctype html>
<html><body style="margin:0;padding:24px;background:#faf7f2;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#2b2b2b">
  <div style="max-width:440px;margin:0 auto;background:#fff;border:1px solid #ece7df;border-radius:14px;padding:28px">
    <p style="margin:0 0 6px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#7f1a4b;font-weight:600">MatchMedia</p>
    <h1 style="margin:0 0 14px;font-size:19px;font-weight:700">Verify your email</h1>
    <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#5c5c5c">Enter this code to confirm your email address.</p>
    <p style="margin:0 0 18px;font-size:30px;font-weight:700;letter-spacing:.22em;font-variant-numeric:tabular-nums">${code}</p>
    <p style="margin:0;font-size:12px;line-height:1.6;color:#8a8a8a">Expires in ${minutes} minutes. If you didn't request this, you can ignore this email.</p>
  </div>
</body></html>`,
  };
}
