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
import { NavDropdown } from "./NavDropdown";
import { UserMenu } from "./UserMenu";
import { MobileMenu, type MobileNavItem } from "./MobileMenu";

export async function Header() {
  const t = await getTranslations("Brand");
  const nav = await getTranslations("Nav");
  const authT = await getTranslations("Auth");
  const adminT = await getTranslations("Admin");
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

  const companyItems = [
    { href: "/about", label: nav("about") },
    { href: "/contact", label: nav("contact") },
    { href: "/terms", label: nav("terms") },
  ];
  const resourcesItems = [
    { href: "/blog", label: nav("blog") },
    { href: "/events", label: nav("events") },
    { href: "/user-guide", label: nav("userGuide") },
  ];
  const adminItems = [
    { href: "/admin", label: adminT("nav.overview") },
    { href: "/admin/photos", label: adminT("nav.photos") },
    { href: "/admin/reports", label: adminT("nav.reports") },
    { href: "/admin/verification", label: adminT("nav.verification") },
    { href: "/admin/users", label: adminT("nav.users") },
  ];

  const mobileNavItems: MobileNavItem[] = session
    ? [
        { href: "/", label: nav("home") },
        { href: "/dashboard", label: nav("dashboard") },
        { href: "/browse", label: nav("browse") },
        { href: "/requests", label: nav("requests") },
        { href: "/interests", label: nav("interests") },
        {
          href: "/messages",
          label: unread > 0 ? `${nav("messages")} (${unread})` : nav("messages"),
        },
        {
          href: "/notifications",
          label:
            unreadNotifications > 0
              ? `${nav("notifications")} (${unreadNotifications})`
              : nav("notifications"),
        },
        ...(isAgent ? [{ href: "/jobs", label: nav("jobs") }] : []),
      ]
    : [];

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
          <div className="hidden items-center gap-4 md:flex">
            {session && (
              <NavLinks
                unread={unread}
                unreadNotifications={unreadNotifications}
                isAgent={isAgent}
                labels={{
                  home: nav("home"),
                  dashboard: nav("dashboard"),
                  browse: nav("browse"),
                  requests: nav("requests"),
                  interests: nav("interests"),
                  messages: nav("messages"),
                  notifications: nav("notifications"),
                  jobs: nav("jobs"),
                }}
              />
            )}
            {isAdmin && <NavDropdown label={nav("admin")} items={adminItems} />}
            <NavDropdown label={nav("company")} items={companyItems} />
            <NavDropdown label={nav("resources")} items={resourcesItems} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <MobileMenu
            menuLabel={nav("menu")}
            navItems={mobileNavItems}
            adminLabel={nav("admin")}
            adminItems={isAdmin ? adminItems : []}
            companyLabel={nav("company")}
            companyItems={companyItems}
            resourcesLabel={nav("resources")}
            resourcesItems={resourcesItems}
          >
            {session?.user ? (
              <div className="flex flex-col gap-2 border-t border-hairline/70 pt-3">
                <p className="truncate px-2 font-body text-xs text-ink/60">
                  {session.user.email}
                </p>
                <Link href="/profile/edit">
                  <Button variant="ghost" size="sm" fullWidth>
                    {nav("editProfile")}
                  </Button>
                </Link>
                <form action={logout}>
                  <Button type="submit" variant="ghost" size="sm" fullWidth>
                    {authT("logout")}
                  </Button>
                </form>
              </div>
            ) : (
              <div className="border-t border-hairline/70 pt-3">
                <Link href="/login">
                  <Button variant="outline" size="sm" fullWidth>
                    {authT("login")}
                  </Button>
                </Link>
              </div>
            )}
          </MobileMenu>
          <LocaleSwitcher />
          <div className="hidden md:flex">
            {session?.user ? (
              <UserMenu
                email={session.user.email ?? ""}
                accountLabel={nav("account")}
                profileLabel={nav("editProfile")}
                logoutLabel={authT("logout")}
                logoutAction={logout}
              />
            ) : (
              <Link href="/login">
                <Button variant="outline" size="sm">
                  {authT("login")}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
