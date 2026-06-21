// Gateway abstraction. The app talks to this interface only; a real BD gateway
// (SSLCommerz / bKash / aamarPay) drops in later by implementing PaymentGateway
// and registering it. For now a MockGateway lets the whole flow run end to end.

import type { Order } from "@prisma/client";
import { SSLCommerzGateway } from "./gateways/sslcommerz";

export interface CreateSessionInput {
  order: Order;
  /** Absolute or app-relative URL to return the user to after payment. */
  returnUrl: string;
  /** Absolute app origin, used to build a gateway's callback URLs. */
  appUrl?: string;
  /** Active locale, so the gateway can return the user to the right path. */
  locale?: string;
}

export interface CreateSessionResult {
  /** Where to send the user's browser to pay. */
  redirectUrl: string;
}

export interface VerifyIpnResult {
  /** Our Order.id, recovered from the gateway payload. */
  orderId: string;
  success: boolean;
  gatewayTxnId?: string;
}

export interface PaymentGateway {
  readonly name: string;
  /** Begin a hosted-payment session for an order. */
  createSession(input: CreateSessionInput): Promise<CreateSessionResult>;
  /**
   * Validate an IPN/callback payload SERVER-SIDE and extract the outcome.
   * Real gateways verify a signature / re-query the gateway here. Never trust
   * the client redirect — only this result drives activation.
   */
  verifyIpn(payload: unknown): Promise<VerifyIpnResult>;
}

/**
 * Mock gateway: "hosting" is just our own /pro/pay/[orderId] page, and the IPN
 * payload is a plain object we construct from the simulated outcome. It proves
 * the create-session → verify → activate path without external dependencies.
 */
class MockGateway implements PaymentGateway {
  readonly name = "mock";

  async createSession({ order }: CreateSessionInput): Promise<CreateSessionResult> {
    // Send the user to the in-app simulated gateway page.
    return { redirectUrl: `/pro/pay/${order.id}` };
  }

  async verifyIpn(payload: unknown): Promise<VerifyIpnResult> {
    const p = (payload ?? {}) as Record<string, unknown>;
    const orderId = String(p.orderId ?? "");
    if (!orderId) throw new Error("mock IPN: missing orderId");
    const success = p.status === "SUCCESS";
    return {
      orderId,
      success,
      gatewayTxnId: typeof p.txnId === "string" ? p.txnId : `MOCK-${Date.now()}`,
    };
  }
}

const GATEWAYS: Record<string, PaymentGateway> = {
  mock: new MockGateway(),
  sslcommerz: new SSLCommerzGateway(),
};

/**
 * The active gateway. Defaults to SSLCommerz (live BD gateway); set
 * PAYMENT_GATEWAY=mock for local development without real payments.
 */
export const DEFAULT_GATEWAY = process.env.PAYMENT_GATEWAY ?? "sslcommerz";

export function getGateway(name: string = DEFAULT_GATEWAY): PaymentGateway {
  const gw = GATEWAYS[name];
  if (!gw) throw new Error(`Unknown payment gateway: ${name}`);
  return gw;
}
