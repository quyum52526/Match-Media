import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { type NextRequest, NextResponse } from "next/server";

const intlMiddleware = createMiddleware(routing);

/**
 * Return the correct public origin for this server.
 *
 * Why not request.nextUrl.origin?
 * Next.js builds nextUrl from the HTTP Host header. On Windows with `next dev`,
 * Node delivers Host: localhost (no port), so nextUrl.origin is also
 * "http://localhost" — the same portless value next-intl uses for its redirect.
 * Comparing them is always equal, so the fix is silently skipped.
 *
 * APP_URL is the authoritative source: it's already in .env for payment
 * callbacks and is always correct. We fall back to nextUrl.origin only when
 * APP_URL is absent (e.g. CI environments that don't set it).
 */
function getCorrectOrigin(request: NextRequest): string {
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
