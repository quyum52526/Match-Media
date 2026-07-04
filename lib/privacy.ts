/**
 * Contact-masking helpers shared by the server data layer and the UI.
 *
 * The server masks phone/email BEFORE they are serialized to the client
 * (see lib/data/profiles.ts), so these utils are the single source of truth
 * for the mask format. Masking is idempotent: masking an already-masked
 * value returns it unchanged, so a client-side re-mask is always safe.
 */

/** "01812345678" → "018****5678". Short values are masked conservatively. */
export function maskPhone(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.length <= 7) return `${trimmed.slice(0, 1)}****`;
  return `${trimmed.slice(0, 3)}****${trimmed.slice(-4)}`;
}

/** "abcdef@gmail.com" → "a***@gmail.com". */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  return `${email[0]}***@${email.slice(at + 1)}`;
}

/** Auto-detects phone vs email by the presence of "@". */
export function maskContact(value: string): string {
  return value.includes("@") ? maskEmail(value) : maskPhone(value);
}
