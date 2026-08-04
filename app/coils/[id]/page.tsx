import Link from "next/link";
import { notFound } from "next/navigation";
import { Scissors } from "lucide-react";
import { requirePageAuth } from "@/lib/auth/guard";
import { getChildren, getPieceById } from "@/lib/queries/stocks";
import { CanvasView } from "@/components/canvas/CanvasView";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { TypeBadge } from "@/components/ui/TypeBadge";
import DeleteOperationButton from "@/components/dashboard/DeleteOperationButton";
import { RecalculateSurfaceCard } from "@/components/dashboard/RecalculateSurfaceCard";
import {
  formatDate,
  formatDimensions,
  formatSurface,
} from "@/lib/utils";

const DELETE_OPERATION_HOURS = 12;

export const dynamic = "force-dynamic";

export default async function CoilDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (Number.isNaN(id)) notFound();
  const session = await requirePageAuth();

  const [bo, children] = await Promise.all([
    getPieceById(id),
    getChildren(id),
  ]);
  if (!bo || bo.type !== "BO") notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-purple-700">
              {bo.name ?? `Bobine #${bo.id}`}
            </h1>
            <TypeBadge type="BO" />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Référence : {bo.reference ?? "—"} · Atelier : {bo.atelier}
          </p>
        </div>
        <Link href={`/cuts/new?source_id=${bo.id}`}>
          <Button>
            <Scissors className="h-4 w-4" /> Enregistrer une coupe
          </Button>
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Dimensions" value={formatDimensions(bo.longueur, bo.largeur)} />
        <Stat
          label="Surface totale"
          value={formatSurface(Math.floor(bo.longueur * bo.largeur / 1_000_000))}
        />
        <RecalculateSurfaceCard
          coilId={bo.id}
          initialSurfaceRestante={bo.surface_restante}
        />
        <Stat
          label="État"
          value={bo.is_consumed ? "Consommée" : "Active"}
        />
        <Stat
          label="Fournisseur"
          value={bo.supplier?.name ?? "—"}
        />
        <Stat
          label="Année de fabrication"
          value={bo.year != null ? String(bo.year) : "—"}
        />
      </div>

      {bo.category && (
        <Card className="mt-4">
          <CardHeader title="Catégorie Bobine" titleClassName="text-purple-500" />
          <CardBody>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
              <Info label="Nom" value={bo.category.name} />
              <Info label="Nature" value={bo.category.nature} />
              <Info label="Couleur" value={bo.category.color} />
              <Info label="Épaisseur" value={bo.category.thickness} />
              <Info label="Plis" value={bo.category.plies} />
              <Info label="Motif" value={bo.category.motif} />
            </div>
          </CardBody>
        </Card>
      )}

      <div className="mt-6">
        <h2 className="mb-2 text-[1.6rem] font-semibold text-purple-500">Aperçue graphique</h2>
        <CanvasView id={bo.id} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-[1.6rem] font-semibold text-purple-500">
          Coupes ({children.length})
        </h2>
        {children.length === 0 && (
          <Card>
            <CardBody>
              <p className="text-center text-sm text-slate-500">
                Aucune coupe enregistrée.
              </p>
            </CardBody>
          </Card>
        )}
        {children.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Dimensions</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Commande</th>
                  <th className="px-4 py-3">Obs.</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {children.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <TypeBadge type={c.type} />
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {c.name ?? `#${c.id}`}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDimensions(c.longueur, c.largeur)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {c.user_full_name ?? c.user_username ?? (c.user_id != null ? `#${c.user_id}` : "—")}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {c.type === "CC" ? (c.cmd_name ?? "—") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {c.observation ? (
                        <span className="group relative inline-block">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-slate-800 rounded whitespace-nowrap z-10">
                            {c.observation}
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDate(c.create_date)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {c.type === "CS" && (
                          <Link
                            href={`/cs/${c.id}`}
                            className="text-xs text-cc hover:underline"
                          >
                            Ouvrir →
                          </Link>
                        )}
                        <DeleteOperationButton
                          id={c.id}
                          create_date={c.create_date}
                          deleteHours={DELETE_OPERATION_HOURS}
                          creatorId={c.user_id}
                          userId={session.id}
                          userRole={session.role}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardBody className="py-4">
        <div className="text-xs uppercase text-slate-500">{label}</div>
        <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
      </CardBody>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-slate-900">
        {value || "—"}
      </div>
    </div>
  );
}
