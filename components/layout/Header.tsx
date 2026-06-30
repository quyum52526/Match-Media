import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { logout } from "@/lib/actions/auth";
import { getViewerId, getViewerRole } from "@/lib/session";
import { getUnreadCount } from "@/lib/data/messages";
import { getUnreadNotificationCount } from "@/lib/data/notifications";
import { Button } from "@/components/ui/Button";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { NavLinks } from "./NavLinks";

export async function Header() {
  const t = await getTranslations("Brand");
  const nav = await getTranslations("Nav");
  const authT = await getTranslations("Auth");
  const session = await auth();
  // Cosmetic only — routes are gated server-side by requireAdmin / role checks.
  const role = session ? await getViewerRole() : null;
  const isAdmin = role === "ADMIN";
  const isAgent = role === "AGENT" || role === "ADMIN";
  const viewerId = session ? await getViewerId() : null;
  const unread = viewerId ? await getUnreadCount(viewerId) : 0;
  const unreadNotifications = viewerId
    ? await getUnreadNotificationCount(viewerId)
    : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-canvas/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          {/* Brand name stays English in every locale */}
          <Link
            href="/"
            className="font-body text-lg font-bold tracking-tight text-ink"
          >
            {t("name")}
          </Link>
          {session && (
            <NavLinks
              unread={unread}
              unreadNotifications={unreadNotifications}
              isAdmin={isAdmin}
              isAgent={isAgent}
              labels={{
                home: nav("home"),
                dashboard: nav("dashboard"),
                browse: nav("browse"),
                requests: nav("requests"),
                interests: nav("interests"),
                messages: nav("messages"),
                notifications: nav("notifications"),
                editProfile: nav("editProfile"),
                admin: nav("admin"),
                jobs: nav("jobs"),
              }}
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          {session?.user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/profile/edit"
                className="hidden font-body text-xs text-ink/60 transition-colors hover:text-ink sm:inline"
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
