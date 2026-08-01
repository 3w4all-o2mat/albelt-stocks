import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePageAuth } from "@/lib/auth/guard";
import { getCutsByType } from "@/lib/queries/stocks";
import { listAteliersForUser } from "@/lib/queries/ateliers";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { AtelierFilter } from "@/components/ui/AtelierFilter";
import SiCutsTable from "@/components/cuts/SiCutsTable";
import AddStockInitialButton from "@/components/forms/AddStockInitialButton";
import { getIntegerVariable } from "@/lib/queries/variables";

export const dynamic = "force-dynamic";

export default async function SIPage({
  searchParams,
}: {
  searchParams?: { atelier?: string };
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

  const [cuts, deleteHours] = await Promise.all([
    getCutsByType("SI", { atelier, allowedAteliers: allowedNames }),
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
            <h1 className="text-2xl font-bold tracking-tight text-si">
              Stock Initial
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {cuts.length} stock(s) initial/initiale(s)
            {atelier ? ` · ${atelier}` : ""}
          </p>
        </div>
        <AtelierFilter ateliers={ateliers} />
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Tous les stocks initiaux"
          subtitle="Coupes de type SI enregistrées"
          titleClassName="text-black"
          action={<AddStockInitialButton defaultAtelier={atelier ?? ""} />}
        />
        <CardBody className="p-0">
          <SiCutsTable
            cuts={cuts}
            deleteHours={deleteHours ?? 12}
            userId={user.id}
            userRole={user.role}
          />
        </CardBody>
      </Card>
    </div>
  );
}
