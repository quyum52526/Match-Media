import "server-only";
import type { SmsProvider } from "../provider";

/**
 * Mock SMS provider: logs the message to the server console instead of sending.
 * Lets the whole OTP flow run end to end with zero credentials — the dev reads
 * the code from the server logs. Selected when SMS_PROVIDER is unset or "mock".
 */
export class MockSmsProvider implements SmsProvider {
  readonly name = "mock";

  async send(to: string, text: string): Promise<void> {
    console.info(`[SMS:mock] -> ${to}: ${text}`);
  }
}
