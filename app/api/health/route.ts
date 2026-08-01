import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// Lightweight liveness + DB readiness probe used by the Docker health check.
// Returns 200 when both the process and the DB are responsive.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await query("SELECT 1");
    return NextResponse.json({ status: "ok", db: "up" });
  } catch (err) {
    return NextResponse.json(
      { status: "degraded", db: "down", error: (err as Error).message },
      { status: 503 }
    );
  }
}
