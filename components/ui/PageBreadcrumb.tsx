"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Crumb {
  label: string;
  href?: string;
}

const LABELS: Record<string, string> = {
  dashboard: "Tableau de bord",
  coils: "Bobines",
  cuts: "Coupes",
  falls: "Chutes",
  cc: "Commandes coupées",
  cs: "Chutes stockées",
  cp: "Chutes perdues",
  si: "Stock Initial",
  new: "Nouveau",
  login: "Connexion",
  profile: "Profil",
  admin: "Admin",
  users: "Utilisateurs",
  bons_atelier: "Bons d'atelier",
};

function labelFor(segment: string): string {
  return LABELS[segment] ?? segment;
}

function buildHref(base: string, query: string): string {
  return query ? `${base}?${query}` : base;
}

export function PageBreadcrumb({ className }: { className?: string }) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  // Skip auth/utility routes
  if (pathname === "/" || pathname.startsWith("/api/")) return null;

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const crumbs: Crumb[] = [
    { label: "Accueil", href: buildHref("/dashboard", query) },
  ];
  let acc = "";
  segments.forEach((seg, i) => {
    acc += `/${seg}`;
    const isLast = i === segments.length - 1;
    // Numeric segment → detail page, label as "#id"
    const isNumeric = /^\d+$/.test(seg);
    const label = isNumeric ? `#${seg}` : labelFor(seg);
    crumbs.push(isLast ? { label } : { label, href: buildHref(acc, query) });
  });

  return (
    <nav
      className={cn(
        "border-b border-slate-100 bg-slate-50/60",
        className
      )}
      aria-label="Breadcrumb"
    >
      <div className="mx-auto max-w-7xl px-4 py-2 flex flex-wrap items-center gap-1 text-sm text-slate-500">
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
              )}
              {isLast || !c.href ? (
                <span className="font-medium text-slate-900">{c.label}</span>
              ) : (
                <Link href={c.href} className="hover:text-slate-900">
                  {c.label}
                </Link>
              )}
            </span>
          );
        })}
      </div>
    </nav>
  );
}