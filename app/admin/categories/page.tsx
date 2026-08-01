import { requirePageAuth } from "@/lib/auth/guard";
import { CategoriesAdmin } from "@/components/auth/CategoriesAdmin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bobine categories — Albelt Stocks",
};

export default async function AdminCategoriesPage() {
  await requirePageAuth();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-purple-700">
          Bobine categories
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage material categories (nature, color, plies, thickness, motif).
          The name is computed automatically.
        </p>
      </div>
      <CategoriesAdmin />
    </div>
  );
}