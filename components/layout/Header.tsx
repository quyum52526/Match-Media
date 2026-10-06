import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { logout } from "@/lib/actions/auth";
import { enterGuestMode, exitGuestMode } from "@/lib/actions/guest";
import { getViewerId, getViewerRole } from "@/lib/session";
import { isAdminRole } from "@/lib/rbac";
import { getAdminNavCounts } from "@/lib/data/admin";
import { isGuestSession } from "@/lib/guest";
import { getUnreadCount } from "@/lib/data/messages";
import { getUnreadNotificationCount } from "@/lib/data/notifications";
import { getActiveContext, getRoleEntitlements } from "@/lib/roleContext";
import { switchRoleContext } from "@/lib/actions/roleContext";
import { Button } from "@/components/ui/Button";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { NavLinks } from "./NavLinks";
import { NavDropdown } from "./NavDropdown";
import { UserMenu, type ContextOption } from "./UserMenu";
import { MobileMenu, type MobileNavItem } from "./MobileMenu";

export async function Header() {
  const t = await getTranslations("Brand");
  const nav = await getTranslations("Nav");
  const authT = await getTranslations("Auth");
  const guestT = await getTranslations("GuestGate");
  const adminT = await getTranslations("Admin");
  const locale = await getLocale();
  const session = await auth();
  // Cosmetic only — routes are gated server-side by requireAdmin / role checks.
  const role = session ? await getViewerRole() : null;
  // isAdminRole, not role === "ADMIN": SUPER_ADMIN sits ABOVE ADMIN, so an
  // exact comparison hid the entire admin nav from the owner account.
  const isAdmin = isAdminRole(role);
  const isAgent = role === "AGENT" || isAdminRole(role);
  const viewerId = session ? await getViewerId() : null;
  const unread = viewerId ? await getUnreadCount(viewerId) : 0;
  const unreadNotifications = viewerId
    ? await getUnreadNotificationCount(viewerId)
    : 0;
  // Guest-preview mode: no session, but the "Explore as Guest" cookie is set.
  const isGuest = !session && (await isGuestSession());
  // Only queried for an admin, so an ordinary page view pays nothing. `cache`d,
  // so on an /admin route the admin layout reuses this same result.
  const adminCounts = isAdmin ? await getAdminNavCounts() : null;

  // Multi-role: the rows for the context switcher in the account menu. An
  // account with nothing but its personal profile gets a single row, and
  // UserMenu then renders no switcher at all. A role still under review is
  // listed disabled so the person can see their application exists.
  const roleT = await getTranslations("RoleSwitcher");
  const expandT = await getTranslations("ExpandAccount");
  const entitlements = viewerId ? await getRoleEntitlements(viewerId) : null;
  const activeContext = viewerId ? await getActiveContext(viewerId) : "PERSONAL";
  const contextOptions: ContextOption[] | undefined = entitlements
    ? [
        {
          context: "PERSONAL" as const,
          icon: "\u{1F464}",
          label: roleT("personal"),
        },
        ...(entitlements.agency === "APPROVED" || entitlements.agency === "PENDING"
          ? [
              {
                context: "AGENCY" as const,
                icon: "\u{1F3E2}",
                label: entitlements.agencyName || roleT("agency"),
                pending: entitlements.agency === "PENDING",
              },
            ]
          : []),
        ...(entitlements.agent === "APPROVED" || entitlements.agent === "PENDING"
          ? [
              {
                context: "AGENT" as const,
                icon: "\u{1F6E1}\u{FE0F}",
                label: roleT("agent"),
                pending: entitlements.agent === "PENDING",
              },
            ]
          : []),
      ]
    : undefined;

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
  // Mirrors the tabs in app/[locale]/admin/layout.tsx — the header dropdown
  // was missing Documents and Settings, so those pages were reachable only by
  // typing the URL.
  const adminItems = [
    { href: "/admin", label: adminT("nav.overview") },
    {
      href: "/admin/photos",
      label: adminT("nav.photos"),
      count: adminCounts?.photos,
    },
    {
      href: "/admin/reports",
      label: adminT("nav.reports"),
      count: adminCounts?.reports,
    },
    {
      href: "/admin/verification",
      label: adminT("nav.verification"),
      count: adminCounts?.verification,
    },
    {
      href: "/admin/verifications",
      label: adminT("nav.documents"),
      count: adminCounts?.documents,
    },
    {
      href: "/admin/applications",
      label: adminT("nav.applications"),
      count: adminCounts?.applications,
    },
    { href: "/admin/users", label: adminT("nav.users") },
    { href: "/admin/settings", label: adminT("nav.settings") },
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
    <header className="sticky top-0 z-40 border-b border-[#8C2F4A]/10 bg-[rgba(251,247,242,0.85)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-4">
          {/* Brand wordmark — links home in every locale. Wide horizontal
              lockup (~10.5:1); kept compact so the packed admin nav row stays
              on one line (see the overflow fix in this file's history). */}
          <Link href="/" aria-label={t("name")} className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/matchmedia-logo-home.svg"
              alt="Match Media Logo"
              className="h-3.5 w-auto sm:h-4 lg:h-3.5 xl:h-4"
            />
          </Link>
          {/* Full nav row needs lg+ to fit (admins carry the most items);
              below that the hamburger menu takes over. */}
          <div className="hidden items-center gap-2 lg:flex">
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

        {/* Right controls: never squeezed (shrink-0) and stacked above any
            overflowing nav content (z-10) so EN/BN stays clickable. */}
        <div className="relative z-10 flex shrink-0 items-center gap-4">
          <MobileMenu
            menuLabel={nav("menu")}
            closeLabel={nav("close")}
            navItems={mobileNavItems}
            adminLabel={nav("admin")}
            adminItems={isAdmin ? adminItems : []}
            companyLabel={nav("company")}
            companyItems={companyItems}
            resourcesLabel={nav("resources")}
            resourcesItems={resourcesItems}
            locale={locale}
            // Signed in: identity and own-account links at the top, log out last.
            accountEmail={session?.user ? (session.user.email ?? "") : undefined}
            profileLabel={nav("editProfile")}
            expandLabel={expandT("menuLabel")}
            logoutLabel={authT("logout")}
            logoutAction={logout}
            // Signed out: the two CTAs a visitor came for, above the nav list.
            loginLabel={authT("login")}
            signUpLabel={authT("registerLink")}
            isGuest={isGuest}
            guestExploreLabel={guestT("explore")}
            guestExitLabel={guestT("exit")}
            guestAction={isGuest ? exitGuestMode : enterGuestMode}
          />
          <LocaleSwitcher />
          <div className="hidden items-center gap-2.5 lg:flex">
            {session?.user ? (
              <UserMenu
                email={session.user.email ?? ""}
                accountLabel={nav("account")}
                profileLabel={nav("editProfile")}
                logoutLabel={authT("logout")}
                logoutAction={logout}
                locale={locale}
                contexts={contextOptions}
                activeContext={activeContext}
                switchLabel={roleT("switchLabel")}
                underReviewLabel={roleT("underReview")}
                switchAction={switchRoleContext}
                expandLabel={expandT("menuLabel")}
                expandTooltip={expandT("menuTooltip")}
              />
            ) : isGuest ? (
              <>
                <form action={exitGuestMode}>
                  <input type="hidden" name="locale" value={locale} />
                  <Button type="submit" variant="ghost" size="sm">
                    {guestT("exit")}
                  </Button>
                </form>
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    {authT("login")}
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <form action={enterGuestMode}>
                  <input type="hidden" name="locale" value={locale} />
                  <Button type="submit" variant="outline" size="sm">
                    {guestT("explore")}
                  </Button>
                </form>
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    {authT("login")}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      {isGuest && (
        <div className="border-t border-accent/30 bg-accent/5 px-4 py-1.5 text-center text-xs font-medium text-ink/70">
          {guestT("banner")}{" "}
          <Link href="/register" className="font-semibold text-accent underline-offset-2 hover:underline">
            {guestT("signup")}
          </Link>
        </div>
      )}
    </header>
  );
}
