import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import {
  getDashboardKpis,
  getRecentCuts,
} from "@/lib/queries/stocks";
import { listAteliersForUser } from "@/lib/queries/ateliers";
import { getIntegerVariable } from "@/lib/queries/variables";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AtelierFilter } from "@/components/ui/AtelierFilter";
import { AvailabilityButton } from "@/components/dashboard/AvailabilityButton";
import { cn, formatSurface } from "@/lib/utils";
import DashboardRecentCutsTable from "@/components/dashboard/DashboardRecentCutsTable";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { atelier?: string };
}) {
  // Defense-in-depth: middleware already gates this route, but verify the
  // session server-side before touching the DB.
  const session = await getCurrentUser();
  if (!session) redirect("/login?next=/dashboard");

  const allowedAteliers = await listAteliersForUser(
    session.id,
    session.role,
    { pageSize: 100 }
  );
  const allowedNames = allowedAteliers.map((a) => a.name);

  let atelier = searchParams?.atelier?.trim() || null;
  if (atelier && !allowedNames.includes(atelier)) {
    atelier = null;
  }

  const [kpis, recent, deleteHours] = await Promise.all([
    getDashboardKpis(atelier, allowedNames),
    getRecentCuts(20, atelier, allowedNames),
    getIntegerVariable("DELETE_OPERATION_HOURS"),
  ]);
  const ateliers = allowedAteliers;

  return (
    <div className="mx-auto max-w-7xl px-4 py-2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="mt-1 text-sm text-slate-500">
            Vue d&apos;ensemble du stock de bobines, commandes et chutes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/bons_atelier">
            <Button variant="secondary" className="border border-slate-300">
              <FileText className="h-4 w-4" />
              Bons d&apos;atelier
            </Button>
          </Link>
          <AvailabilityButton
            atelier={atelier}
            allowedAteliers={allowedNames}
          />
          <AtelierFilter ateliers={ateliers} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Link
          href={atelier ? `/coils?atelier=${encodeURIComponent(atelier)}` : "/coils"}
          className="block h-full"
        >
          <KpiCard
            label="Bobines"
            labelClassName="font-bold text-purple-600"
            value={
              <span className="flex items-baseline gap-2">
                <span className="font-bold">{kpis.boCount},  </span>
                <span className="text-base font-normal text-slate-400">
                  {formatSurface(Math.floor(kpis.boTotalSurface / 1_000_000))}
                </span>
              </span>
            }
            accent="bg-purple-600"
            clickable
            className="border-purple-500"
          />
        </Link>
        <Link
          href={atelier ? `/cc?atelier=${encodeURIComponent(atelier)}` : "/cc"}
          className="block h-full"
        >
          <KpiCard
            label="Commandes coupées"
            labelClassName="font-bold text-blue-500"
            value={
              <span className="flex items-baseline gap-2">
                <span className="font-bold">{kpis.ccCount},  </span>
                <span className="text-base font-normal text-slate-400">
                  {formatSurface(Math.floor(kpis.ccTotalSurface / 1_000_000))}
                </span>
              </span>
            }
            sub=""
            accent="bg-blue-500"
            clickable
            className="border-blue-500"
          />
        </Link>
        <Link
          href={atelier ? `/cs?atelier=${encodeURIComponent(atelier)}` : "/cs"}
          className="block h-full"
        >
          <KpiCard
            label="Chutes stockées"
            labelClassName="font-bold text-orange-500"
            value={
              <span className="flex items-baseline gap-2">
                <span className="font-bold">{kpis.csCount},  </span>
                <span className="text-base font-normal text-slate-400">
                  {formatSurface(kpis.csTotalSurface)}
                </span>
              </span>
            }
            accent="bg-cs"
            clickable
            className="border-cs"
          />
        </Link>
        <Link
          href={atelier ? `/cp?atelier=${encodeURIComponent(atelier)}` : "/cp"}
          className="block h-full"
        >
          <KpiCard
            label="Chutes perdues"
            labelClassName="font-bold text-red-500"
            value={
              <span className="flex items-baseline gap-2">
                <span className="font-bold">{kpis.cpCount},  </span>
                <span className="text-base font-normal text-slate-400">
                  {formatSurface(kpis.cpLostSurface)}
                </span>
              </span>
            }
            accent="bg-cp"
            clickable
            className="border-cp"
          />
        </Link>
        <Link
          href={atelier ? `/si?atelier=${encodeURIComponent(atelier)}` : "/si"}
          className="block h-full"
        >
          <KpiCard
            label="Stock Initial"
            labelClassName="font-bold text-si"
            value={
              <span className="flex items-baseline gap-2">
                <span className="font-bold">{kpis.siCount},  </span>
                <span className="text-base font-normal text-slate-400">
                  {formatSurface(kpis.siTotalSurface)}
                </span>
              </span>
            }
            accent="bg-si"
            clickable
            className="border-si"
          />
        </Link>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Opérations récentes"
          subtitle="Dernières opérations enregistrées"
          titleClassName="text-purple-400"
        />
        <CardBody className="p-0">
          <DashboardRecentCutsTable
            cuts={recent}
            deleteHours={deleteHours ?? 12}
            userId={session.id}
            userRole={session.role}
          />
        </CardBody>
      </Card>
    </div>
  );
}

function KpiCard({
  label,
  labelClassName,
  value,
  sub,
  accent,
  clickable,
  className,
}: {
  label: string;
  labelClassName?: string;
  value: React.ReactNode;
  sub?: string;
  accent: string;
  clickable?: boolean;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "h-full",
        clickable && "transition-shadow hover:shadow-md",
        className
      )}
    >
      <CardBody className="flex h-full items-center py-5">
        <div className="flex items-center gap-3">
          <span className={`inline-block h-9 w-1.5 rounded-full ${accent}`} />
          <div>
            <div className={cn("text-xs uppercase", !labelClassName && "text-slate-500", labelClassName)}>{label}</div>
            <div className="mt-0.5 text-2xl font-bold text-slate-900">
              {value}
            </div>
            {sub && <div className="text-xs text-slate-400">{sub}</div>}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
