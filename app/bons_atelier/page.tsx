import Link from "next/link";
import { requirePageAuth } from "@/lib/auth/guard";
import { findUserById } from "@/lib/queries/membership";
import { listAteliersForUser } from "@/lib/queries/ateliers";
import {
  countBonsAtelierByStatus,
  listBonsAtelier,
} from "@/lib/queries/odoo";
import { Card, CardBody } from "@/components/ui/Card";
import { BonsAtelierControls } from "@/components/bons_atelier/BonsAtelierControls";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { PrintDeliveryButton } from "@/components/bons_atelier/PrintDeliveryButton";
import { AdvanceProcessButton } from "@/components/bons_atelier/AdvanceProcessButton";
import { CompleteProcessButton } from "@/components/bons_atelier/CompleteProcessButton";
import { AutoRefresh } from "@/components/AutoRefresh";
import type { BonAtelierStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_STATUSES: BonAtelierStatus[] = ["1", "2", "3"];

interface StatusCardConfig {
  status: BonAtelierStatus;
  label: string;
  /** Tailwind classes for the inactive state. */
  base: string;
  /** Tailwind classes applied when this status is the active filter. */
  active: string;
}

const STATUS_CARDS: StatusCardConfig[] = [
  {
    status: "1",
    label: "طلبيات مستلمة",
    base: "bg-red-50 border-red-200 text-red-700 hover:bg-red-100",
    active: "bg-red-500 text-white border-red-500",
  },
  {
    status: "2",
    label: "طلبيات قيد الانجاز",
    base: "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100",
    active: "bg-orange-500 text-white border-orange-500",
  },
  {
    status: "3",
    label: "طلبيات منجزة",
    base: "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100",
    active: "bg-emerald-500 text-white border-emerald-500",
  },
];

export default async function BonsAtelierPage({
  searchParams,
}: {
  searchParams?: { atelier?: string; status?: string };
}) {
  const session = await requirePageAuth();
  const user = await findUserById(session.id);

  const allowedAteliers = await listAteliersForUser(
    session.id,
    session.role,
    { pageSize: 100 }
  );
  const allowedIds = allowedAteliers.map((a) => a.id);

  // Resolve the selected atelier: explicit query param → user default → first allowed.
  let atelierId: number | null = null;
  const paramAtelier = searchParams?.atelier?.trim();
  if (paramAtelier) {
    const parsed = Number(paramAtelier);
    if (Number.isInteger(parsed) && allowedIds.includes(parsed)) {
      atelierId = parsed;
    }
  }
  if (atelierId == null) {
    if (user?.atelier_id != null && allowedIds.includes(user.atelier_id)) {
      atelierId = user.atelier_id;
    } else if (allowedIds.length > 0) {
      atelierId = allowedIds[0];
    }
  }

  // Resolve the selected status (default = "1").
  const paramStatus = searchParams?.status?.trim();
  const status: BonAtelierStatus = VALID_STATUSES.includes(
    paramStatus as BonAtelierStatus
  )
    ? (paramStatus as BonAtelierStatus)
    : "1";

  const selectedAtelier =
    allowedAteliers.find((a) => a.id === atelierId) ?? null;
  const atelierName = selectedAtelier?.name ?? null;
  // Odoo stores the atelier code (text) in sn_sales_commandes.atelier.
  const atelierCode = selectedAtelier?.code ?? null;

  // No atelier available → empty state.
  if (atelierId == null || atelierCode == null) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-2">
        <h1 className="text-2xl font-bold tracking-tight text-purple-700">
          Bons d&apos;atelier
        </h1>
        <div className="mt-6">
          <Card>
            <CardBody>
              <p className="text-sm text-slate-500">
                Aucun atelier n&apos;est disponible. Contactez un administrateur
                pour qu&apos;un atelier vous soit assigné.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  const [commandes, counts] = await Promise.all([
    listBonsAtelier({ atelierCode, currentProcess: status }),
    countBonsAtelierByStatus(atelierCode),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-2">
      <AutoRefresh atelierCode={atelierCode} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-purple-700">
            Bons d&apos;atelier
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Commandes Odoo par atelier{atelierName ? ` — ${atelierName}` : ""}.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <BonsAtelierControls
          ateliers={allowedAteliers}
          selectedAtelierId={atelierId}
          selectedStatus={status}
        />
      </div>

      {/* Status filter cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {STATUS_CARDS.map((card) => {
          const isActive = card.status === status;
          const count = counts[card.status] ?? 0;
          return (
            <Link
              key={card.status}
              href={`/bons_atelier?atelier=${atelierId}&status=${card.status}`}
              className={`block rounded-xl border p-5 shadow-sm transition-colors ${
                isActive ? card.active : card.base
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold" dir="rtl">
                  {card.label}
                </span>
                <span
                  className={`text-3xl font-bold ${
                    isActive ? "text-white" : ""
                  }`}
                >
                  {count}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Commandes list for the active status */}
      <div className="mt-6 space-y-4">
        {commandes.length === 0 ? (
          <Card className={`min-h-[300px] ${status === "1" ? "border-red-500" : status === "2" ? "border-orange-500" : "border-emerald-500"}`}>
            <CardBody className="flex min-h-[300px] items-center justify-center">
              <h1 className={`text-2xl font-bold ${status === "1" ? "text-red-600" : status === "2" ? "text-orange-600" : "text-emerald-600"}`}>
                {status === "1" && "لا توجد طلبيات مستلمة"}
                {status === "2" && "لا توجد طلبيات قيد الانجاز"}
                {status === "3" && "لا توجد طلبيات منجزة"}
              </h1>
            </CardBody>
          </Card>
        ) : (
          commandes.map((cmd) => (
            <Card key={cmd.id} className={`border-2 ${status === "1" ? "border-red-500" : status === "2" ? "border-orange-500" : "border-emerald-500"}`}>
              <CardBody className="p-0">
                {/* Combined row: 3 columns — name+client | date | priority+atelier+agent */}
                <div className="grid grid-cols-10 items-start border-b border-slate-100 bg-slate-50/50 px-4 py-2 text-xs text-slate-500 font-bold">
                  {/* Column 1 (40%): commande name + client name */}
                  <div className="col-span-4">
                    <div className="text-base font-semibold text-purple-600">
                      {cmd.name}
                    </div>
                    {cmd.partner_name && (
                      <div className="mt-0.5 text-sm text-slate-500">
                        {cmd.partner_name}
                      </div>
                    )}
                  </div>

                  {/* Column 2 (30%): date centered */}
                  <div className="col-span-3 text-center">
                    {cmd.current_process_datetime && (
                      <div>
                        {new Date(cmd.current_process_datetime).toLocaleDateString("fr-DZ", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    )}
                  </div>

                  {/* Column 3 (30%): priority + atelier code | agent name */}
                  <div className="col-span-3 text-end">
                    <div className="text-sm text-slate-500">
                      {cmd.priority != null && <PriorityBadge priority={cmd.priority} />}
                      {cmd.priority != null && atelierCode && <span> </span>}
                      {atelierCode && <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">{atelierCode}</span>}
                    </div>
                    {cmd.user_name && (
                      <div className="text-sm text-slate-500">
                        {cmd.user_name}
                      </div>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="w-[25%] px-4 py-3">Code</th>
                        <th className="px-4 py-3">Désignation</th>
                        <th className="px-4 py-3 text-center">Qté</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cmd.lines.map((line) => (
                        <tr key={line.line_id} className="hover:bg-slate-50">
                          <td className="w-[25%] align-top px-4 py-3 font-mono text-slate-700">
                            {line.product_code ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-800">
                            <span className="whitespace-pre-line">
                              {line.name}
                            </span>
                          </td>
                          <td className="align-top px-4 py-3 text-center font-bold text-slate-700">
                            <div>{line.qty}</div>
                            {cmd.current_process === "3" && (
                              <div className="mt-1.5">
                                <PrintDeliveryButton
                                  line={line}
                                  cmd={cmd}
                                  atelierCode={atelierCode}
                                />
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-2">
                  <AdvanceProcessButton
                    commandeId={cmd.id}
                    currentProcess={cmd.current_process}
                    commandeName={cmd.name}
                  />
                  <CompleteProcessButton
                    commandeId={cmd.id}
                    currentProcess={cmd.current_process}
                    commandeName={cmd.name}
                  />
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}