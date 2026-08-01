import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth/current-user";
import { findUserById } from "@/lib/queries/membership";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { RoleBadge } from "@/components/ui/RoleBadge";

const APP_LINKS = [
  { href: "/dashboard", label: "Tableau de bord" },
];

export async function NavBar() {
  const user = await getCurrentUser();
  const profile = user ? await findUserById(user.id) : null;
  const displayName = profile?.full_name?.trim() || user?.username || "";

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href={user ? "/dashboard" : "/login"} className="flex items-center gap-2">
          <Image
            src="/images/logo.png"
            alt="Albelt Stocks"
            width={31}
            height={31}
            priority
          />
          <span className="text-[1.6rem] font-semibold tracking-tight">
            Albelt <span className="text-slate-400">Stocks</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {user
            ? (
              <>
                {APP_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium text-slate-600",
                      "hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    )}
                  >
                    {l.label}
                  </Link>
                ))}
                {user.role === "master" && (
                  <Link
                    href="/admin/users"
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium text-slate-600",
                      "hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    )}
                  >
                    Admin
                  </Link>
                )}
                <Link
                  href="/profile"
                  className="ml-2 flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  <RoleBadge role={user.role} />
                  <span className="hidden sm:inline">{displayName}</span>
                </Link>
                <LogoutButton />
              </>
            )
            : (
              <Link
                href="/login"
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium text-slate-600",
                  "hover:bg-slate-100 hover:text-slate-900 transition-colors"
                )}
              >
                Sign in
              </Link>
            )}
        </nav>
      </div>
    </header>
  );
}
