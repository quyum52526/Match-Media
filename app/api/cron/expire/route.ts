import { NextResponse, type NextRequest } from "next/server";
import { runExpirySweep } from "@/lib/billing/expiry";

// Always run on demand; never cache.
export const dynamic = "force-dynamic";

/**
 * Daily expiry sweep endpoint. Schedule it (e.g. Vercel Cron in vercel.json) to
 * hit this path; Vercel automatically sends `Authorization: Bearer $CRON_SECRET`.
 * Without a configured CRON_SECRET the endpoint refuses to run, so it can never
 * be triggered anonymously.
 */
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  // Fallback for schedulers that can't set headers.
  if (req.nextUrl.searchParams.get("key") === secret) return true;
  return false;
}

async function handle(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runExpirySweep();
  return NextResponse.json({ ok: true, ...result });
}

export const GET = handle;
export const POST = handle;
