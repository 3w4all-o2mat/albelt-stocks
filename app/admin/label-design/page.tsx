import { requirePageAuth } from "@/lib/auth/guard";
import { LabelDesignAdmin } from "@/components/auth/LabelDesignAdmin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Conception d'Étiquettes — Albelt Stocks",
};

export default async function AdminLabelDesignPage() {
  await requirePageAuth();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Conception d'Étiquettes
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Concevez les modèles d'étiquette de stockage et d'étiquette de livraison utilisés lors de l'impression des étiquettes pour les coupes. Utilisez des variables comme{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">{`{{name}}`}</code> pour insérer des valeurs dynamiques.
        </p>
      </div>
      <LabelDesignAdmin />
    </div>
  );
}
