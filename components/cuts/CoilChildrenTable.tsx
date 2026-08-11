"use client";

import { useState } from "react";
import Link from "next/link";
import type { PieceType, StockPiece } from "@/lib/types";
import { formatDate, formatDimensions } from "@/lib/utils";
import { TypeBadge } from "@/components/ui/TypeBadge";
import DeleteOperationButton from "@/components/dashboard/DeleteOperationButton";
import CutDetailModal from "./CutDetailModal";

interface CoilChildrenTableProps {
  children: StockPiece[];
  deleteHours: number;
  userId: number;
  userRole: "master" | "manager" | "user";
}

// Text color of the clickable label depending on the piece type (CS, CC, CP, SI, BO)
const NAME_STYLES: Record<PieceType, string> = {
  CC: "text-cc hover:text-cc/80",
  CS: "text-cs hover:text-cs/80",
  CP: "text-cp hover:text-cp/80",
  SI: "text-si hover:text-si/80",
  BO: "text-purple-600 hover:text-purple-800",
};

export default function CoilChildrenTable({
  children,
  deleteHours,
  userId,
  userRole,
}: CoilChildrenTableProps) {
  const [selectedCut, setSelectedCut] = useState<StockPiece | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  function openModal(cut: StockPiece) {
    setSelectedCut(cut);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    // Delay clearing so the exit animation can play
    setTimeout(() => setSelectedCut(null), 200);
  }

  return (
    <>
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
                  <button
                    onClick={() => openModal(c)}
                    className={`${NAME_STYLES[c.type] ?? "text-slate-900"} hover:underline transition-colors text-left`}
                    title="Voir les détails"
                  >
                    {c.name ?? `#${c.id}`}
                  </button>
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
                      deleteHours={deleteHours}
                      creatorId={c.user_id}
                      userId={userId}
                      userRole={userRole}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CutDetailModal
        cut={selectedCut}
        isOpen={isModalOpen}
        onClose={closeModal}
        hideDeliveryButton={selectedCut?.type !== "CC"}
        hideCommandSection={selectedCut?.type !== "CC"}
      />
    </>
  );
}
