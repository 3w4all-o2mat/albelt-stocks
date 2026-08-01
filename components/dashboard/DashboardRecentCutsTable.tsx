"use client";

import { useState } from "react";
import type { StockPiece, PieceType } from "@/lib/types";
import { formatDimensions, formatSurface, formatDate } from "@/lib/utils";
import { TypeBadge } from "@/components/ui/TypeBadge";
import DeleteOperationButton from "@/components/dashboard/DeleteOperationButton";
import CutDetailModal from "@/components/cuts/CutDetailModal";

interface DashboardRecentCutsTableProps {
  cuts: StockPiece[];
  deleteHours: number;
  userId: number;
  userRole: "master" | "manager" | "user";
}

const NAME_COLORS: Partial<Record<PieceType, string>> = {
  BO: "text-purple-700",
  CC: "text-cc",
  CS: "text-cs",
  CP: "text-cp",
  SI: "text-si",
};

/**
 * Returns whether the cut type should show the command section in the modal.
 * Only CC (order cuts) have a meaningful command reference.
 */
function showCommandSection(type: PieceType): boolean {
  return type === "CC";
}

/**
 * Returns whether the cut type should show the delivery button.
 * Only CC (order cuts) have a delivery label.
 */
function showDeliveryButton(type: PieceType): boolean {
  return type === "CC";
}

export default function DashboardRecentCutsTable({
  cuts,
  deleteHours,
  userId,
  userRole,
}: DashboardRecentCutsTableProps) {
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
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#eaeaea] text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3 text-center">Type</th>
              <th className="px-5 py-3">Nom</th>
              <th className="px-5 py-3">Dimensions</th>
              <th className="px-5 py-3 text-center">Commande</th>
              <th className="px-5 py-3 text-center">Atelier</th>
              <th className="px-5 py-3 text-center">Date/Heure</th>
              <th className="px-5 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cuts.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-8 text-center text-slate-500"
                >
                  Aucune opération récente.
                </td>
              </tr>
            )}
            {cuts.map((c) => {
              const nameColor = NAME_COLORS[c.type] ?? "text-slate-900";
              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-center">
                    <TypeBadge type={c.type} />
                  </td>
                  <td className="px-5 py-3 font-bold">
                    <button
                      onClick={() => openModal(c)}
                      className={`${nameColor} hover:underline transition-colors text-left`}
                      title="Voir les détails"
                    >
                      {c.name ?? `#${c.id}`}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    {formatDimensions(c.longueur, c.largeur)}
                  </td>
                  <td className="px-5 py-3 text-center">{c.cmd_name}</td>
                  <td className="px-5 py-3 text-center">{c.atelier}</td>
                  <td className="px-5 py-3 text-center text-slate-500">
                    {formatDate(c.create_date)}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <DeleteOperationButton
                      id={c.id}
                      create_date={c.create_date}
                      deleteHours={deleteHours}
                      creatorId={c.user_id}
                      userId={userId}
                      userRole={userRole}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedCut && (
        <CutDetailModal
          cut={selectedCut}
          isOpen={isModalOpen}
          onClose={closeModal}
          hideDeliveryButton={!showDeliveryButton(selectedCut.type)}
          hideCommandSection={!showCommandSection(selectedCut.type)}
        />
      )}
    </>
  );
}
