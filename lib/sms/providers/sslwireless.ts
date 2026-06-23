// SSL Wireless SMS provider — the same vendor family as the SSLCommerz payment
// gateway already wired in lib/billing/gateways/sslcommerz.ts.
//
// Config is env-driven and validated lazily so the app boots without creds (dev
// uses the mock provider). Set SMS_PROVIDER=sslwireless + the creds below to go
// live. The HTTP shape follows SSL Wireless's "SMS API v3" single-text endpoint;
// adjust the field names to match your account's API doc if they differ.
import "server-only";
import type { SmsProvider } from "../provider";

interface SslSmsConfig {
  apiToken: string;
  sid: string;
  apiUrl: string;
}

function config(): SslSmsConfig {
  const apiToken = process.env.SSLSMS_API_TOKEN;
  const sid = process.env.SSLSMS_SID;
  if (!apiToken || !sid) {
    throw new Error(
      "SSL Wireless SMS not configured: set SSLSMS_API_TOKEN and SSLSMS_SID",
    );
  }
  return {
    apiToken,
    sid,
    apiUrl:
      process.env.SSLSMS_API_URL ??
      "https://smsplus.sslwireless.com/api/v3/send-sms",
  };
}

export class SslWirelessProvider implements SmsProvider {
  readonly name = "sslwireless";

  async send(to: string, text: string): Promise<void> {
    const cfg = config();
    const res = await fetch(cfg.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_token: cfg.apiToken,
        sid: cfg.sid,
        msisdn: to,
        sms: text,
        // Unique per request so the gateway can dedupe retries.
        csms_id: `MM${Date.now()}`,
      }),
    });
    if (!res.ok) {
      throw new Error(`SSL Wireless SMS HTTP ${res.status}`);
    }
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    // SSL Wireless returns status "SUCCESS" on accept; anything else is a failure.
    if (data.status && data.status !== "SUCCESS") {
      throw new Error(
        `SSL Wireless SMS rejected: ${String(data.status_code ?? data.status)}`,
      );
    }
  }
}
