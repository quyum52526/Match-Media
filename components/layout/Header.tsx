import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { logout } from "@/lib/actions/auth";
import { getViewerId, getViewerRole } from "@/lib/session";
import { getUnreadCount } from "@/lib/data/messages";
import { Button } from "@/components/ui/Button";
import { LocaleSwitcher } from "./LocaleSwitcher";

export async function Header() {
  const t = await getTranslations("Brand");
  const nav = await getTranslations("Nav");
  const authT = await getTranslations("Auth");
  const session = await auth();
  // Cosmetic only — the /admin routes are gated server-side by requireAdmin.
  const isAdmin = session ? (await getViewerRole()) === "ADMIN" : false;
  const viewerId = session ? await getViewerId() : null;
  const unread = viewerId ? await getUnreadCount(viewerId) : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-charcoal/10 bg-ivory/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          {/* Brand name stays English in every locale */}
          <Link
            href="/"
            className="font-sans text-lg font-bold tracking-tight text-charcoal"
          >
            {t("name")}
          </Link>
          {session && (
            <nav className="flex items-center gap-4">
              <Link
                href="/browse"
                className="text-sm font-medium text-charcoal/70 transition-colors hover:text-charcoal"
              >
                {nav("browse")}
              </Link>
              <Link
                href="/requests"
                className="text-sm font-medium text-charcoal/70 transition-colors hover:text-charcoal"
              >
                {nav("requests")}
              </Link>
              <Link
                href="/interests"
                className="text-sm font-medium text-charcoal/70 transition-colors hover:text-charcoal"
              >
                {nav("interests")}
              </Link>
              <Link
                href="/messages"
                className="relative text-sm font-medium text-charcoal/70 transition-colors hover:text-charcoal"
              >
                {nav("messages")}
                {unread > 0 && (
                  <span className="absolute -right-3 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-trustGreen px-1 font-sans text-[10px] font-semibold text-white">
                    {unread}
                  </span>
                )}
              </Link>
              <Link
                href="/profile/edit"
                className="text-sm font-medium text-charcoal/70 transition-colors hover:text-charcoal"
              >
                {nav("editProfile")}
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="text-sm font-semibold text-trustGreen transition-colors hover:text-trustGreen/80"
                >
                  {nav("admin")}
                </Link>
              )}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          {session?.user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/profile/edit"
                className="hidden font-sans text-xs text-charcoal/60 transition-colors hover:text-charcoal sm:inline"
              >
                {session.user.email}
              </Link>
              <form action={logout}>
                <Button type="submit" variant="ghost" size="sm">
                  {authT("logout")}
                </Button>
              </form>
            </div>
          ) : (
            <Link href="/login">
              <Button variant="outline" size="sm">
                {authT("login")}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
