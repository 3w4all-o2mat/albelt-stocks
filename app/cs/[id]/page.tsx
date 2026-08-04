import Link from "next/link";
import { notFound } from "next/navigation";
import { Info, Scissors } from "lucide-react";
import { requirePageAuth } from "@/lib/auth/guard";
import { getChildren, getPieceById } from "@/lib/queries/stocks";
import { getIntegerVariable } from "@/lib/queries/variables";
import { CanvasView } from "@/components/canvas/CanvasView";
import { FallBreadcrumb } from "@/components/canvas/FallView";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { TypeBadge } from "@/components/ui/TypeBadge";
import DeleteOperationButton from "@/components/dashboard/DeleteOperationButton";
import {
  formatDate,
  formatDimensions,
  formatSurface,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FallDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (Number.isNaN(id)) notFound();
  const user = await requirePageAuth();

  const [cs, children, deleteHours] = await Promise.all([
    getPieceById(id),
    getChildren(id),
    getIntegerVariable("DELETE_OPERATION_HOURS"),
  ]);
  if (!cs || cs.type !== "CS") notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-2">
      <FallBreadcrumb id={cs.id} />

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-purple-700">
              {cs.name ?? `Chute #${cs.id}`}
            </h1>
            <TypeBadge type="CS" />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {cs.chained_name ?? "—"} · Atelier : {cs.atelier}
          </p>
        </div>
        <Link href={`/cuts/new?source_id=${cs.id}`}>
          <Button>
            <Scissors className="h-4 w-4" /> Enregistrer une coupe
          </Button>
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Dimensions" value={formatDimensions(cs.longueur, cs.largeur)} />
        <Stat label="Surface" value={formatSurface(cs.surface)} />
        <Stat label="Surface restante" value={formatSurface(cs.surface_restante)} />
        <Stat
          label="État"
          value={cs.is_consumed ? "Consommée" : "En stock"}
        />
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-[1.6rem] font-semibold text-purple-500">Aperçue graphique</h2>
        <CanvasView id={cs.id} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-[1.6rem] font-semibold text-purple-500">
          Coupes ({children.length})
        </h2>
        <Card>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#e9eaec] text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3 text-left">Type</th>
                    <th className="px-5 py-3 text-left">Nom</th>
                    <th className="px-5 py-3 text-center">Dimensions</th>
                    <th className="px-5 py-3 text-left">Utilisateur</th>
                    <th className="px-5 py-3 text-left">Commande</th>
                    <th className="px-5 py-3 text-center">Obs.</th>
                    <th className="px-5 py-3 text-center">Date</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {children.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                        Aucune coupe sur cette chute.
                      </td>
                    </tr>
                  )}
                  {children.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <TypeBadge type={c.type} />
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          {c.name ?? `#${c.id}`}
                          {c.type === "CS" && (
                            <Link
                              href={`/cs/${c.id}`}
                              className="shrink-0 text-[0.7rem] text-cc hover:underline"
                            >
                              Ouvrir →
                            </Link>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center whitespace-nowrap">
                        {formatDimensions(c.longueur, c.largeur)}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {c.user_full_name ?? c.user_username ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        {c.type === "CC" && c.cmd_name ? c.cmd_name : "—"}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {c.observation ? (
                          <span className="group relative inline-flex cursor-help">
                            <Info className="h-4 w-4 text-blue-500" />
                            <span className="invisible absolute bottom-full left-1/2 z-10 mb-2 w-max max-w-[260px] -translate-x-1/2 rounded-md bg-slate-800 px-3 py-1.5 text-[0.65rem] leading-tight text-white opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:opacity-100">
                              {c.observation}
                              <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                            </span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-5 py-3 text-center text-slate-500 whitespace-nowrap">
                        {formatDate(c.create_date)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <DeleteOperationButton
                          id={c.id}
                          create_date={c.create_date}
                          deleteHours={deleteHours ?? 12}
                          creatorId={c.create_uid}
                          userId={user.id}
                          userRole={user.role}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardBody className="py-3">
        <div className="text-[0.7rem] uppercase text-slate-500">{label}</div>
        <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
      </CardBody>
    </Card>
  );
}
