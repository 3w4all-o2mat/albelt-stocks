import { requirePageAuth } from "@/lib/auth/guard";
import { EntreAteliersAdmin } from "@/components/auth/EntreAteliersAdmin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Entre Ateliers — Albelt Stocks",
};

export default async function AdminEntreAteliersPage() {
  await requirePageAuth();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-purple-700">
          Entre Ateliers
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Transférer des pièces (bobines, coupes, chutes) d&apos;un atelier à un autre.
        </p>
      </div>
      <EntreAteliersAdmin />
    </div>
  );
}
