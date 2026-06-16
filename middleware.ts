import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except API routes, Next internals, and files with an
  // extension (e.g. /favicon.ico, /og.png). The locale prefix is applied to
  // everything else.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
