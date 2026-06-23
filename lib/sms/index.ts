import "server-only";
import type { SmsProvider } from "./provider";
import { MockSmsProvider } from "./providers/mock";
import { SslWirelessProvider } from "./providers/sslwireless";

export type { SmsProvider } from "./provider";

const PROVIDERS: Record<string, SmsProvider> = {
  mock: new MockSmsProvider(),
  sslwireless: new SslWirelessProvider(),
};

/**
 * The active SMS provider. Defaults to the mock (dev-safe: logs to the console)
 * so the app runs without credentials; set SMS_PROVIDER=sslwireless to send real
 * messages. Mirrors getGateway() in lib/billing/gateway.ts.
 */
export const DEFAULT_SMS_PROVIDER = process.env.SMS_PROVIDER ?? "mock";

export function getSmsProvider(name: string = DEFAULT_SMS_PROVIDER): SmsProvider {
  const provider = PROVIDERS[name];
  if (!provider) throw new Error(`Unknown SMS provider: ${name}`);
  return provider;
}
