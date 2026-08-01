import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePageAuth } from "@/lib/auth/guard";
import { getCutsByType } from "@/lib/queries/stocks";
import { listAteliersForUser } from "@/lib/queries/ateliers";
import { Card, CardHeader } from "@/components/ui/Card";
import { AtelierFilter } from "@/components/ui/AtelierFilter";
import { AdvancedFilters } from "@/components/ui/AdvancedFilters";
import CutsTable from "@/components/cuts/CutsTable";
import { getIntegerVariable } from "@/lib/queries/variables";

export const dynamic = "force-dynamic";

export default async function CCPage({
  searchParams,
}: {
  searchParams?: { atelier?: string; cmd_name?: string; client_name?: string };
}) {
  const user = await requirePageAuth();
  const allowedAteliers = await listAteliersForUser(
    user.id,
    user.role,
    { pageSize: 100 }
  );
  const allowedNames = allowedAteliers.map((a) => a.name);

  let atelier = searchParams?.atelier?.trim() || null;
  if (atelier && !allowedNames.includes(atelier)) {
    atelier = null;
  }

  const cmdName = searchParams?.cmd_name?.trim() || null;
  const clientName = searchParams?.client_name?.trim() || null;

  const [cuts, deleteHours] = await Promise.all([
    getCutsByType("CC", { atelier, allowedAteliers: allowedNames, cmdName, clientName }),
    getIntegerVariable("DELETE_OPERATION_HOURS"),
  ]);
  const ateliers = allowedAteliers;

  return (
    <div className="mx-auto max-w-7xl px-4 py-2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-blue-600">
              Commandes coupées
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {cuts.length} coupe(s) commande
            {atelier ? ` · ${atelier}` : ""}
          </p>
        </div>
        <AtelierFilter ateliers={ateliers} />
      </div>

      <AdvancedFilters cmdName={cmdName ?? undefined} clientName={clientName ?? undefined} />

      <Card className="mt-6">
        <CardHeader
          title="Toutes les commandes coupées"
          subtitle="Coupes de type CC enregistrées"
          titleClassName="text-blue-500"
        />
        <CutsTable
          cuts={cuts}
          deleteHours={deleteHours ?? 12}
          userId={user.id}
          userRole={user.role}
        />
      </Card>
    </div>
  );
}
