import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { listActiveSuppliers } from "@/lib/queries/suppliers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const suppliers = await listActiveSuppliers();
    return NextResponse.json(suppliers);
  } catch (err) {
    console.error("GET /api/suppliers", err);
    return NextResponse.json(
      { error: "Failed to load suppliers" },
      { status: 500 }
    );
  }
}
