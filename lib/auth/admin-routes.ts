/**
 * Admin sub-routes accessible to each role.
 * Keep this list in sync with the middleware enforcement and the AdminSidebar
 * filtering. The middleware uses it to block access; the sidebar uses it to
 * hide links a user is not allowed to follow.
 */
export const ADMIN_ROUTES_BY_ROLE: Record<"master" | "manager", string[]> = {
  master: [
    "/admin/users",
    "/admin/ateliers",
    "/admin/entre-ateliers",
    "/admin/categories",
    "/admin/suppliers",
    "/admin/countries",
    "/admin/journal",
    "/admin/variables",
    "/admin/label-design",
  ],
  manager: [
    "/admin/entre-ateliers",
    "/admin/categories",
  ],
};

/**
 * Default admin landing page for a given role.
 */
export const ADMIN_DEFAULT_ROUTE: Record<"master" | "manager", string> = {
  master: "/admin/users",
  manager: "/admin/entre-ateliers",
};

/**
 * Check whether `pathname` (an `/admin` or `/api/admin` route) is allowed for
 * `role`. The root `/admin` and `/admin/` paths are always allowed; any
 * sub-path is matched against the role's allowlist.
 */
export function isAdminRouteAllowed(
  pathname: string,
  role: "master" | "manager"
): boolean {
  // Strip the API prefix when comparing against the shared allowlist so the
  // same list can cover both /admin/* and /api/admin/*.
  const normalised = pathname.startsWith("/api/admin")
    ? pathname.replace(/^\/api\/admin/, "/admin")
    : pathname;

  if (normalised === "/admin" || normalised === "/admin/") return true;
  const allowed = ADMIN_ROUTES_BY_ROLE[role] ?? [];
  return allowed.some(
    (route) => normalised === route || normalised.startsWith(`${route}/`)
  );
}
