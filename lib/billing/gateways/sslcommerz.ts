// SSLCommerz PaymentGateway — bKash/Nagad/cards via the hosted checkout.
//
// Flow: createSession POSTs our store creds + order to SSLCommerz and gets a
// GatewayPageURL to redirect the user to. After payment SSLCommerz calls us back
// (browser success/fail/cancel + server-to-server IPN); verifyIpn re-queries the
// Validation API with val_id — the ONLY trusted signal — and checks the paid
// amount/currency against the order before we activate it.
//
// Config is env-driven; it defaults to SSLCommerz's public sandbox test store so
// the flow works out of the box. Set real creds + SSLCOMMERZ_SANDBOX=false to
// go live.
import "server-only";
import { prisma } from "@/lib/prisma";
import type {
  CreateSessionInput,
  CreateSessionResult,
  PaymentGateway,
  VerifyIpnResult,
} from "../gateway";

interface SslConfig {
  storeId: string;
  storePasswd: string;
  sandbox: boolean;
}

function config(): SslConfig {
  return {
    // Public sandbox demo store; override in .env for your account.
    storeId: process.env.SSLCOMMERZ_STORE_ID ?? "testbox",
    storePasswd: process.env.SSLCOMMERZ_STORE_PASSWD ?? "qwerty",
    // Sandbox unless explicitly disabled.
    sandbox: process.env.SSLCOMMERZ_SANDBOX !== "false",
  };
}

function apiHost(sandbox: boolean): string {
  return sandbox
    ? "https://sandbox.sslcommerz.com"
    : "https://securepay.sslcommerz.com";
}

/** Absolute origin used to build the callback URLs SSLCommerz redirects to. */
function appBase(appUrl?: string): string {
  if (!appUrl && !process.env.APP_URL) {
    throw new Error("APP_URL env var is required for payment gateway callbacks.");
  }
  return (appUrl ?? process.env.APP_URL!).replace(/\/$/, "");
}

export class SSLCommerzGateway implements PaymentGateway {
  readonly name = "sslcommerz";

  async createSession({
    order,
    appUrl,
    locale,
  }: CreateSessionInput): Promise<CreateSessionResult> {
    const cfg = config();
    const base = appBase(appUrl);

    // Customer fields are mandatory for SSLCommerz; fill from the buyer.
    const user = await prisma.user.findUnique({
      where: { id: order.userId },
      include: { profile: true },
    });

    const body = new URLSearchParams({
      store_id: cfg.storeId,
      store_passwd: cfg.storePasswd,
      total_amount: (order.finalAmount / 100).toFixed(2), // poisha -> BDT
      currency: order.currency,
      tran_id: order.id, // our id, echoed back in every callback
      success_url: `${base}/api/payments/sslcommerz/success`,
      fail_url: `${base}/api/payments/sslcommerz/abort`,
      cancel_url: `${base}/api/payments/sslcommerz/abort`,
      ipn_url: `${base}/api/payments/sslcommerz/ipn`,
      shipping_method: "NO",
      product_name: order.planName,
      product_category: "Subscription",
      product_profile: "non-physical-goods",
      num_of_item: "1",
      cus_name: user?.profile?.fullName?.trim() || user?.email || "MatchMedia Member",
      cus_email: user?.email ?? "noreply@matchmedia.com.bd",
      cus_add1: "N/A",
      cus_city: "Dhaka",
      cus_postcode: "0000",
      cus_country: "Bangladesh",
      cus_phone: user?.mobile ?? "01700000000",
      // Custom field echoed back in callbacks — carries the locale so we can
      // return the user to the right /pro/success path.
      value_a: locale ?? "bn",
    });

    const res = await fetch(`${apiHost(cfg.sandbox)}/gwprocess/v4/api.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) {
      throw new Error(`SSLCommerz session HTTP ${res.status}`);
    }
    const data = (await res.json()) as Record<string, unknown>;
    if (data.status !== "SUCCESS" || typeof data.GatewayPageURL !== "string") {
      throw new Error(
        `SSLCommerz session failed: ${String(data.failedreason ?? data.status ?? "unknown")}`,
      );
    }

    return { redirectUrl: data.GatewayPageURL };
  }

  async verifyIpn(payload: unknown): Promise<VerifyIpnResult> {
    const p = (payload ?? {}) as Record<string, unknown>;
    const orderId = String(p.tran_id ?? "");
    const valId = String(p.val_id ?? "");
    if (!orderId) throw new Error("SSLCommerz callback: missing tran_id");
    // No val_id means a failed/cancelled attempt — nothing to validate.
    if (!valId) return { orderId, success: false };

    const cfg = config();
    const url =
      `${apiHost(cfg.sandbox)}/validator/api/validationserverAPI.php` +
      `?val_id=${encodeURIComponent(valId)}` +
      `&store_id=${encodeURIComponent(cfg.storeId)}` +
      `&store_passwd=${encodeURIComponent(cfg.storePasswd)}` +
      `&format=json`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`SSLCommerz validation HTTP ${res.status}`);
    const data = (await res.json()) as Record<string, unknown>;

    const status = String(data.status ?? "");
    const currency = String(data.currency ?? "");
    const paid = Number.parseFloat(String(data.amount ?? "0"));

    // Re-check against OUR order: amount + currency must match, defeating a
    // tampered callback that claims a smaller payment.
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { finalAmount: true, currency: true },
    });
    if (!order) return { orderId, success: false };

    const amountMatches = Math.round(paid * 100) === order.finalAmount;
    const success =
      (status === "VALID" || status === "VALIDATED") &&
      currency === order.currency &&
      amountMatches;

    if (!success) {
      console.warn(
        `SSLCommerz validation rejected order ${orderId}: status=${status} currency=${currency} paid=${paid}`,
      );
    }

    return {
      orderId,
      success,
      gatewayTxnId: String(data.bank_tran_id ?? valId),
    };
  }
}
