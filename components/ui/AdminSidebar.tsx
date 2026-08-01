"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Factory, ArrowLeftRight, Layers, ScrollText, SlidersHorizontal, Globe, Truck, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/ateliers", label: "Ateliers", icon: Factory },
  { href: "/admin/entre-ateliers", label: "Entre Ateliers", icon: ArrowLeftRight },
  { href: "/admin/categories", label: "Bobine Categories", icon: Layers },
  { href: "/admin/suppliers", label: "Fournisseurs", icon: Truck },
  { href: "/admin/countries", label: "Pays", icon: Globe },
  { href: "/admin/journal", label: "Journal", icon: ScrollText },
  { href: "/admin/variables", label: "Variables", icon: SlidersHorizontal },
  { href: "/admin/label-design", label: "Etiquettes", icon: FileText },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-slate-200 bg-white">
      <div className="px-4 py-5">
        <Link
          href="/admin"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-900"
        >
          <LayoutDashboard className="h-4 w-4 text-slate-500" />
          Admin
        </Link>
        <p className="mt-1 text-xs text-slate-400">Membership console</p>
      </div>

      <nav className="px-2 pb-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.disabled ? "#" : item.href}
                  aria-disabled={item.disabled}
                  tabIndex={item.disabled ? -1 : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    item.disabled && "cursor-not-allowed opacity-50 hover:bg-transparent"
                  )}
                  title={item.disabled ? "Coming soon" : undefined}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}