"use client";

import { useState } from "react";
import Link from "next/link";
import { Cylinder } from "lucide-react";
import type { BO } from "@/lib/types";
import { formatDimensions, formatSurface } from "@/lib/utils";
import CutDetailModal from "./CutDetailModal";

interface CoilsTableProps {
  bos: BO[];
}

export default function CoilsTable({ bos }: CoilsTableProps) {
  const [selectedBo, setSelectedBo] = useState<BO | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  function openModal(bo: BO) {
    setSelectedBo(bo);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setTimeout(() => setSelectedBo(null), 200);
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-purple-700 text-xs uppercase text-white">
            <tr>
              <th className="px-5 py-3 text-center">Nom</th>
              <th className="px-5 py-3 text-center w-10"></th>
              <th className="px-5 py-3 text-center">Dimensions</th>
              <th className="px-5 py-3 text-center">Atelier</th>
              <th className="px-5 py-3 text-center hidden">Fournisseur</th>
              <th className="px-5 py-3 text-center">Année</th>
              <th className="px-5 py-3 text-center">Surface totale</th>
              <th className="px-5 py-3 text-center">Surface restante</th>
              <th className="px-5 py-3 text-center">État</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bos.length === 0 && (
              <tr>
                <td colSpan={9} className="px-5 py-8 text-center text-slate-500">
                  Aucune bobine pour le moment.
                </td>
              </tr>
            )}
            {bos.map((bo) => (
              <tr
                key={bo.id}
                className="hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <td className="px-5 py-3">
                  <button
                    onClick={() => openModal(bo)}
                    className="font-bold text-purple-700 hover:text-purple-800 hover:underline transition-colors text-left"
                    title="Voir les détails"
                  >
                    {bo.name ?? `#${bo.id}`}
                  </button>
                </td>
                <td className="px-2 py-3 text-center">
                  <Link
                    href={`/coils/${bo.id}`}
                    className="inline-flex items-center justify-center text-slate-400 hover:text-purple-600 transition-colors"
                    title="Ouvrir le canvas"
                  >
                    <Cylinder className="h-4 w-4" />
                  </Link>
                </td>
                <td className="px-5 py-3 text-center">
                  {formatDimensions(bo.longueur, bo.largeur)}
                </td>
                <td className="px-5 py-3 text-center">{bo.atelier}</td>
                <td className="px-5 py-3 text-center hidden">
                  {bo.supplier?.name ?? (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-center">
                  {bo.year ?? (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  {formatSurface(Math.floor(bo.longueur * bo.largeur / 1_000_000))}
                </td>
                <td className="px-5 py-3 text-right">
                  {formatSurface(bo.surface_restante)}
                </td>
                <td className="px-5 py-3">
                  {bo.is_consumed ? (
                    <span className="text-xs font-medium text-cp">
                      Consommée
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-emerald-600">
                      Active
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CutDetailModal
        cut={selectedBo}
        isOpen={isModalOpen}
        onClose={closeModal}
        hideDeliveryButton
        hideCommandSection
      />
    </>
  );
}
