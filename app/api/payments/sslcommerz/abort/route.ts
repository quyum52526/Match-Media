import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * SSLCommerz fail/cancel redirect (browser POST). No activation happens here —
 * we just send the user back to checkout with a retry message.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const payload = Object.fromEntries(form.entries());
  const locale = String(payload.value_a ?? "bn");
  const prefix = locale === "en" ? "/en" : "";
  const orderId = String(payload.tran_id ?? "");

  const dest = orderId
    ? `${prefix}/pro/checkout/${orderId}?status=failed`
    : `${prefix}/pro`;
  return NextResponse.redirect(new URL(dest, req.url), 303);
}
