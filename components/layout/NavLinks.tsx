"use client";

import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { BellIcon } from "@/components/ui/icons";

interface NavLinksProps {
  unread: number;
  unreadNotifications: number;
  isAdmin: boolean;
  isAgent: boolean;
  labels: {
    home: string;
    dashboard: string;
    browse: string;
    requests: string;
    interests: string;
    messages: string;
    notifications: string;
    editProfile: string;
    admin: string;
    jobs: string;
  };
}

function navLink(pathname: string, href: string): string {
  const active =
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  return [
    "relative text-sm font-medium transition-colors duration-150",
    active
      ? "text-primary font-semibold after:absolute after:-bottom-0.5 after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-primary"
      : "text-ink/60 hover:text-ink",
  ].join(" ");
}

function iconLink(pathname: string, href: string): string {
  const active = pathname.startsWith(href);
  return [
    "relative transition-colors duration-150",
    active ? "text-primary" : "text-ink/60 hover:text-ink",
  ].join(" ");
}

export function NavLinks({
  unread,
  unreadNotifications,
  isAdmin,
  isAgent,
  labels,
}: NavLinksProps) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-4">
      <Link href="/" className={navLink(pathname, "/")}>
        {labels.home}
      </Link>
      <Link href="/dashboard" className={navLink(pathname, "/dashboard")}>
        {labels.dashboard}
      </Link>
      <Link href="/browse" className={navLink(pathname, "/browse")}>
        {labels.browse}
      </Link>
      <Link href="/requests" className={navLink(pathname, "/requests")}>
        {labels.requests}
      </Link>
      <Link href="/interests" className={navLink(pathname, "/interests")}>
        {labels.interests}
      </Link>
      <Link href="/messages" className={navLink(pathname, "/messages")}>
        {labels.messages}
        {unread > 0 && (
          <span className="absolute -right-3 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-body text-[10px] font-semibold text-white">
            {unread}
          </span>
        )}
      </Link>
      <Link
        href="/notifications"
        aria-label={labels.notifications}
        title={labels.notifications}
        className={iconLink(pathname, "/notifications")}
      >
        <BellIcon width={20} height={20} />
        {unreadNotifications > 0 && (
          <span className="absolute -right-2 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-body text-[10px] font-semibold text-white">
            {unreadNotifications}
          </span>
        )}
      </Link>
      <Link href="/profile/edit" className={navLink(pathname, "/profile/edit")}>
        {labels.editProfile}
      </Link>
      {(isAgent || isAdmin) && (
        <Link href="/jobs" className={navLink(pathname, "/jobs")}>
          {labels.jobs}
        </Link>
      )}
      {isAdmin && (
        <Link
          href="/admin"
          className={
            navLink(pathname, "/admin") +
            " !text-primary hover:!text-primary/80"
          }
        >
          {labels.admin}
        </Link>
      )}
    </nav>
  );
}
