import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { logout } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { LocaleSwitcher } from "./LocaleSwitcher";

export async function Header() {
  const t = await getTranslations("Brand");
  const nav = await getTranslations("Nav");
  const authT = await getTranslations("Auth");
  const session = await auth();

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
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          {session?.user ? (
            <div className="flex items-center gap-2">
              <span className="hidden font-sans text-xs text-charcoal/60 sm:inline">
                {session.user.email}
              </span>
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
