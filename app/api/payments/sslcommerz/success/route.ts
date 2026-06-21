import { NextResponse, type NextRequest } from "next/server";
import { getGateway } from "@/lib/billing/gateway";
import { activateOrder } from "@/lib/billing/orders";

export const dynamic = "force-dynamic";

/**
 * SSLCommerz success redirect (browser POST). We re-validate via the gateway
 * (val_id -> Validation API) and activate idempotently — this also backstops a
 * delayed/missing server-to-server IPN. The client POST is never trusted on its
 * own. On success the user lands on /pro/success; otherwise back to checkout.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const payload = Object.fromEntries(form.entries());
  const locale = String(payload.value_a ?? "bn");
  const prefix = locale === "en" ? "/en" : "";
  let orderId = String(payload.tran_id ?? "");

  try {
    const result = await getGateway("sslcommerz").verifyIpn(payload);
    orderId = result.orderId || orderId;
    if (result.success) {
      await activateOrder(result.orderId, {
        gateway: "sslcommerz",
        gatewayTxnId: result.gatewayTxnId,
      });
      return NextResponse.redirect(
        new URL(`${prefix}/pro/success?order=${orderId}`, req.url),
        303,
      );
    }
  } catch (error) {
    console.error("SSLCommerz success handler", error);
  }

  const dest = orderId
    ? `${prefix}/pro/checkout/${orderId}?status=failed`
    : `${prefix}/pro`;
  return NextResponse.redirect(new URL(dest, req.url), 303);
}
