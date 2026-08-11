import Link from "next/link";
import { notFound } from "next/navigation";
import { Scissors } from "lucide-react";
import { requirePageAuth } from "@/lib/auth/guard";
import { getChildren, getPieceById } from "@/lib/queries/stocks";
import { CanvasView } from "@/components/canvas/CanvasView";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { RecalculateSurfaceCard } from "@/components/dashboard/RecalculateSurfaceCard";
import CoilChildrenTable from "@/components/cuts/CoilChildrenTable";
import { formatDimensions, formatSurface } from "@/lib/utils";

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
          <CoilChildrenTable
            children={children}
            deleteHours={DELETE_OPERATION_HOURS}
            userId={session.id}
            userRole={session.role}
          />
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
