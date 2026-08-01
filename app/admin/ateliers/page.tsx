import { requirePageAuth } from "@/lib/auth/guard";
import { AteliersAdmin } from "@/components/auth/AteliersAdmin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ateliers — Albelt Stocks",
};

export default async function AdminAteliersPage() {
  await requirePageAuth();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-purple-700">
          Ateliers
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage the list of workshops available for stock pieces.
        </p>
      </div>
      <AteliersAdmin />
    </div>
  );
}