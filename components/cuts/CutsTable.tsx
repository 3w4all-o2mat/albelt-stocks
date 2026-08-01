"use client";

import { useState } from "react";
import type { StockPiece } from "@/lib/types";
import { formatDimensions, formatSurface, formatDate } from "@/lib/utils";
import DeleteOperationButton from "@/components/dashboard/DeleteOperationButton";
import CutDetailModal from "./CutDetailModal";

interface CutsTableProps {
  cuts: StockPiece[];
  deleteHours: number;
  userId: number;
  userRole: "master" | "manager" | "user";
}

export default function CutsTable({
  cuts,
  deleteHours,
  userId,
  userRole,
}: CutsTableProps) {
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
          <thead className="bg-blue-600 text-xs uppercase text-white">
            <tr>
              <th className="px-5 py-3 text-left">Nom</th>
              <th className="px-5 py-3 text-center">Dimensions</th>
              <th className="px-5 py-3 text-center">Surface</th>
              <th className="px-5 py-3 text-left">Commande</th>
              <th className="px-5 py-3 text-center">Atelier</th>
              <th className="px-5 py-3 text-center">Date</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cuts.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-8 text-center text-slate-500"
                >
                  Aucune commande coupée pour le moment.
                </td>
              </tr>
            )}
            {cuts.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-medium text-slate-900">
                  <button
                    onClick={() => openModal(c)}
                    className="text-[#3d5ca0] hover:text-[#2d4a80] hover:underline transition-colors text-left"
                    title="Voir les détails"
                  >
                    {c.name ?? `#${c.id}`}
                  </button>
                </td>
                <td className="px-5 py-3 text-center">
                  {formatDimensions(c.longueur, c.largeur)}
                </td>
                <td className="px-5 py-3 text-right">
                  {formatSurface(c.surface)}
                </td>
                <td className="px-5 py-3">{c.cmd_name ?? "—"}</td>
                <td className="px-5 py-3 text-center">{c.atelier}</td>
                <td className="px-5 py-3 text-center text-slate-500">
                  {formatDate(c.create_date)}
                </td>
                <td className="px-5 py-3 text-right">
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
            ))}
          </tbody>
        </table>
      </div>

      <CutDetailModal
        cut={selectedCut}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </>
  );
}
