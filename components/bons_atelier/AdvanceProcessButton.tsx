"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";

interface AdvanceProcessButtonProps {
  commandeId: number;
  currentProcess: string;
  commandeName: string;
}

/**
 * Renders the "إنطلاق العملية" button for a single commande card.
 *
 * Visibility: only when `currentProcess === "1"`.
 * On click: shows a styled confirmation modal, then POSTs to the
 * advance-process API on confirm.
 * On success: triggers router.refresh() so the card disappears from the
 * current "1" tab and reappears in the "2" tab.
 */
export function AdvanceProcessButton({
  commandeId,
  currentProcess,
  commandeName,
}: AdvanceProcessButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/odoo/commande/${commandeId}/advance-process`,
        { method: "POST" }
      );
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Erreur lors de l'avancement du processus");
      }
      return data;
    },
    onSuccess: () => {
      setError(null);
      setShowConfirm(false);
      router.refresh();
    },
    onError: (e: Error) => setError(e.message),
  });

  // Close on Escape key.
  useEffect(() => {
    if (!showConfirm) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !mutation.isPending) {
        setShowConfirm(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showConfirm, mutation.isPending]);

  if (currentProcess !== "1") return null;

  const handleOpenConfirm = () => {
    if (mutation.isPending) return;
    setError(null);
    setShowConfirm(true);
  };

  const handleCancel = () => {
    if (mutation.isPending) return;
    setShowConfirm(false);
  };

  const handleConfirm = () => {
    if (mutation.isPending) return;
    setError(null);
    mutation.mutate();
  };

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={handleOpenConfirm}
          disabled={mutation.isPending}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-pink-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mutation.isPending ? "جاري…" : "إنطلاق العملية"}
        </button>
        {error && !showConfirm && (
          <div className="text-xs font-medium text-red-600">{error}</div>
        )}
      </div>

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={handleCancel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="advance-confirm-title"
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Header — pink band matching the button */}
            <div className="relative bg-pink-600 px-6 py-5 text-white">
              <button
                type="button"
                onClick={handleCancel}
                disabled={mutation.isPending}
                className="absolute left-3 top-3 rounded-full p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
              <h2
                id="advance-confirm-title"
                className="text-center text-xl font-bold tracking-wide"
              >
                إنطلاق العملية
              </h2>
            </div>

            {/* Body */}
            <div className="space-y-3 px-6 py-6 text-center">
              <p className="text-base font-medium leading-relaxed text-slate-800">
                هل تريد تأكيد انطلاق العملية للطلبية
                <span className="mx-2 inline-block rounded-md bg-pink-50 px-2 py-0.5 font-mono font-bold text-pink-700">
                  {commandeName}
                </span>
                ؟
              </p>
              <p className="text-sm text-slate-500">
                سيتم تحديث حالة الطلبية إلى المرحلة التالية.
              </p>

              {error && (
                <div className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
                  {error}
                </div>
              )}
            </div>

            {/* Footer — actions */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={handleCancel}
                disabled={mutation.isPending}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={mutation.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-pink-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mutation.isPending ? "جاري…" : "تأكيد الانطلاق"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
