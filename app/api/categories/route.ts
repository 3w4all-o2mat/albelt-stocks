import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { getAllCategories } from "@/lib/queries/categories";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const categories = await getAllCategories();
    return NextResponse.json(categories);
  } catch (err) {
    console.error("GET /api/categories", err);
    return NextResponse.json(
      { error: "Failed to load categories" },
      { status: 500 }
    );
  }
}
