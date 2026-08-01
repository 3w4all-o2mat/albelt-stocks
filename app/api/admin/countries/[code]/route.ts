import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import {
  deleteCountry,
  findCountryByCode,
  isCountryCodeTaken,
  updateCountry,
} from "@/lib/queries/countries";
import type { UpdateCountryInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { code: string } }
) {
  const auth = await requireRole(req, ["master"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const country = await findCountryByCode(params.code);
    if (!country) {
      return NextResponse.json(
        { success: false, error: "Country not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: country });
  } catch (err) {
    console.error("GET /api/admin/countries/[code]", err);
    return NextResponse.json(
      { success: false, error: "Failed to load country" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { code: string } }
) {
  const auth = await requireRole(req, ["master"]);
  if (auth instanceof NextResponse) return auth;

  const code = params.code;

  let body: UpdateCountryInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const existing = await findCountryByCode(code);
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Country not found" },
      { status: 404 }
    );
  }

  if (body.name_fr !== undefined) {
    const trimmed = body.name_fr.trim();
    if (!trimmed) {
      return NextResponse.json(
        { success: false, error: "name_fr cannot be empty" },
        { status: 400 }
      );
    }
    body.name_fr = trimmed;
  }
  if (body.name_en !== undefined) {
    const trimmed = body.name_en.trim();
    if (!trimmed) {
      return NextResponse.json(
        { success: false, error: "name_en cannot be empty" },
        { status: 400 }
      );
    }
    body.name_en = trimmed;
  }

  try {
    const updated = await updateCountry(code, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("PUT /api/admin/countries/[code]", err);
    return NextResponse.json(
      { success: false, error: "Failed to update country" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { code: string } }
) {
  const auth = await requireRole(req, ["master"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const country = await findCountryByCode(params.code);
    if (!country) {
      return NextResponse.json(
        { success: false, error: "Country not found" },
        { status: 404 }
      );
    }

    await deleteCountry(params.code);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    // Catching FK violation if suppliers reference this country
    if (err?.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cannot delete this country: it is referenced by one or more suppliers.",
        },
        { status: 409 }
      );
    }
    console.error("DELETE /api/admin/countries/[code]", err);
    return NextResponse.json(
      { success: false, error: "Failed to delete country" },
      { status: 500 }
    );
  }
}
