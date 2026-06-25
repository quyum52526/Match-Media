// SMS provider abstraction. The app talks to this interface only; a real BD
// gateway (SSL Wireless / bulksmsbd / Twilio) drops in by implementing
// SmsProvider and registering it in ./index.ts. Mirrors the billing
// PaymentGateway pattern (lib/billing/gateway.ts) so the swap is config-only.

export interface SmsProvider {
  readonly name: string;
  /**
   * Deliver a plain-text SMS. Throws on failure — callers that must never block
   * a user flow (e.g. OTP send) decide whether to swallow the error.
   */
  send(to: string, text: string): Promise<void>;
}
