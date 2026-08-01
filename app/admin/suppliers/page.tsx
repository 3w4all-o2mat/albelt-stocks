import { requirePageAuth } from "@/lib/auth/guard";
import { SuppliersAdmin } from "@/components/auth/SuppliersAdmin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Suppliers — Albelt Stocks",
};

export default async function AdminSuppliersPage() {
  await requirePageAuth();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-purple-700">
          Fournisseurs
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Gérer les fournisseurs. Chaque fournisseur est lié à un pays.
        </p>
      </div>
      <SuppliersAdmin />
    </div>
  );
}
