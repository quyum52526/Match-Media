import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { type NextRequest, NextResponse } from "next/server";

const intlMiddleware = createMiddleware(routing);

/**
 * Return the correct public origin for this server.
 *
 * In production (Vercel or any reverse proxy), the platform sets the
 * `x-forwarded-host` / `x-forwarded-proto` headers to the real public origin,
 * so we derive it dynamically from the request. We must NOT use APP_URL here:
 * APP_URL may legitimately hold a localhost dev value, and trusting it in
 * production would redirect live users to localhost.
 *
 * APP_URL is only a *local-dev* fallback. On Windows with `next dev`, Node
 * delivers `Host: localhost` (no port), so `request.nextUrl.origin` becomes a
 * portless "http://localhost" — the same value next-intl uses for its redirect,
 * making the comparison below a no-op. APP_URL (e.g. http://localhost:3000)
 * supplies the correct dev origin in that case.
 */
function getCorrectOrigin(request: NextRequest): string {
  // Production / proxied: trust the forwarded headers, never APP_URL.
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${forwardedHost}`;
  }

  // Local-dev fallback only (no forwarded headers present).
  if (process.env.APP_URL) {
    try {
      return new URL(process.env.APP_URL).origin;
    } catch {
      // Invalid APP_URL — fall through to nextUrl
    }
  }
  return request.nextUrl.origin;
}

export default function middleware(request: NextRequest): NextResponse {
  const response = intlMiddleware(request);

  const location = response.headers.get("location");
  const isRedirect =
    response.status === 301 ||
    response.status === 302 ||
    response.status === 307 ||
    response.status === 308;

  if (isRedirect && location) {
    try {
      const redirectUrl = new URL(location);
      const correctOrigin = getCorrectOrigin(request);

      if (redirectUrl.origin !== correctOrigin) {
        const correctedUrl = new URL(
          redirectUrl.pathname + redirectUrl.search + redirectUrl.hash,
          correctOrigin,
        );

        const fixed = NextResponse.redirect(correctedUrl.toString(), {
          status: response.status,
        });
        // Carry over cookies and any other headers next-intl set
        response.headers.forEach((value, key) => {
          if (key !== "location") fixed.headers.set(key, value);
        });
        return fixed;
      }
    } catch {
      // Malformed Location — pass the original response through unchanged
    }
  }

  return response;
}

export const config = {
  // Match all pathnames except API routes, Next internals, and static files.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
