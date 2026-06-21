import { NextResponse, type NextRequest } from "next/server";
import { getGateway } from "@/lib/billing/gateway";
import { activateOrder } from "@/lib/billing/orders";

/**
 * Server-verified payment notification (IPN). Real gateways POST here
 * out-of-band; the gateway impl validates the payload, and ONLY a verified
 * success activates the order. Activation is idempotent, so a replayed IPN is
 * safe. The client redirect is never trusted for activation.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ gateway: string }> },
) {
  const { gateway } = await params;

  let gw;
  try {
    gw = getGateway(gateway);
  } catch {
    return NextResponse.json({ error: "unknown gateway" }, { status: 404 });
  }

  // Accept either JSON or form-encoded callbacks.
  let payload: unknown;
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    payload = await req.json();
  } else {
    const form = await req.formData();
    payload = Object.fromEntries(form.entries());
  }

  let result;
  try {
    result = await gw.verifyIpn(payload);
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  if (result.success) {
    await activateOrder(result.orderId, {
      gateway,
      gatewayTxnId: result.gatewayTxnId,
    });
  }

  return NextResponse.json({ ok: true, activated: result.success });
}
