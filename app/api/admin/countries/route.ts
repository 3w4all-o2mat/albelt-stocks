import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import {
  createCountry,
  isCountryCodeTaken,
  listCountries,
} from "@/lib/queries/countries";
import type { NewCountryInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireRole(req, ["master"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const countries = await listCountries();
    return NextResponse.json({ success: true, data: countries });
  } catch (err) {
    console.error("GET /api/admin/countries", err);
    return NextResponse.json(
      { success: false, error: "Failed to load countries" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ["master"]);
  if (auth instanceof NextResponse) return auth;

  let body: Partial<NewCountryInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const code = (body.code ?? "").trim().toUpperCase();
  if (!code) {
    return NextResponse.json(
      { success: false, error: "Code is required" },
      { status: 400 }
    );
  }
  if (code.length > 3) {
    return NextResponse.json(
      { success: false, error: "Code must be 3 characters or fewer" },
      { status: 400 }
    );
  }

  const name_fr = (body.name_fr ?? "").trim();
  if (!name_fr) {
    return NextResponse.json(
      { success: false, error: "name_fr is required" },
      { status: 400 }
    );
  }

  const name_en = (body.name_en ?? "").trim();
  if (!name_en) {
    return NextResponse.json(
      { success: false, error: "name_en is required" },
      { status: 400 }
    );
  }

  if (await isCountryCodeTaken(code)) {
    return NextResponse.json(
      { success: false, error: "A country with this code already exists" },
      { status: 409 }
    );
  }

  try {
    const created = await createCountry({ code, name_fr, name_en });
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/countries", err);
    return NextResponse.json(
      { success: false, error: "Failed to create country" },
      { status: 500 }
    );
  }
}
