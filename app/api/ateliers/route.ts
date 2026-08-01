import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { listAteliersForUser } from "@/lib/queries/ateliers";

export const dynamic = "force-dynamic";

/**
 * List of ateliers the current user is allowed to view/use.
 * Masters see all active ateliers; manager/user see only assigned ones.
 * Used by forms (e.g. NewCoilForm) to pick an atelier from the DB.
 */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? undefined;

  const items = await listAteliersForUser(auth.user.id, auth.user.role, {
    search,
    pageSize: 100,
  });
  // Return a flat array of ateliers for convenience.
  return NextResponse.json(items);
}