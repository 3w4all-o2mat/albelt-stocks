import { requirePageAuth } from "@/lib/auth/guard";
import { CountriesAdmin } from "@/components/auth/CountriesAdmin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pays — Albelt Stocks",
};

export default async function AdminCountriesPage() {
  await requirePageAuth();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-purple-700">
          Pays
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Gérer la liste des pays utilisés pour les fournisseurs.
        </p>
      </div>
      <CountriesAdmin />
    </div>
  );
}
