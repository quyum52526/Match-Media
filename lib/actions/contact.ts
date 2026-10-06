"use server";

import { sendEmail } from "@/lib/email/provider";

const CONTACT_INBOX = "info@matchmediabd.xyz";

const CATEGORIES = {
  general: "General Inquiry",
  account: "Account Help",
  agency: "Agency Support",
  verification: "Verification",
} as const;

export type ContactCategory = keyof typeof CATEGORIES;

export type ContactFormState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; error: "invalid" | "failed" };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Public contact form → email to the support inbox. Replies go straight to the
 * visitor via reply-to. A hidden `company` field catches naive bots: when it is
 * filled we report success without sending anything.
 */
export async function sendContactMessage(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  if (String(formData.get("company") ?? "").trim()) {
    return { status: "success" };
  }

  // Collapse whitespace in single-line fields so nothing can inject headers.
  const name = String(formData.get("name") ?? "").replace(/\s+/g, " ").trim();
  const email = String(formData.get("email") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const message = String(formData.get("message") ?? "").trim();

  if (
    !name ||
    name.length > 100 ||
    email.length > 254 ||
    !EMAIL_RE.test(email) ||
    !(category in CATEGORIES) ||
    message.length < 10 ||
    message.length > 5000
  ) {
    return { status: "error", error: "invalid" };
  }

  const categoryLabel = CATEGORIES[category as ContactCategory];
  const sent = await sendEmail({
    to: CONTACT_INBOX,
    replyTo: email,
    subject: `[Contact] ${categoryLabel} — ${name}`,
    text: `Name: ${name}\nEmail: ${email}\nCategory: ${categoryLabel}\n\n${message}`,
    html: `<!doctype html>
<html><body style="margin:0;padding:24px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#2b2b2b">
  <p><strong>Name:</strong> ${escapeHtml(name)}<br>
  <strong>Email:</strong> ${escapeHtml(email)}<br>
  <strong>Category:</strong> ${escapeHtml(categoryLabel)}</p>
  <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
</body></html>`,
  });

  return sent ? { status: "success" } : { status: "error", error: "failed" };
}
