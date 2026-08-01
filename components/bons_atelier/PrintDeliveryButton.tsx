"use client";

import { useState, useCallback, useEffect } from "react";
import { Printer, X } from "lucide-react";
import QRCode from "qrcode";
import type { BonAtelierLine, BonAtelierCommande } from "@/lib/types";
import { formatDate } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Default delivery template for bons_atelier lines
// ---------------------------------------------------------------------------
const DEFAULT_BONS_ATELIER_TEMPLATE = `
<div style="font-family: Arial, sans-serif; max-width: 300px; border: 1px solid #000; padding: 12px; text-align: center;">
  <h2 style="font-size: 14px; margin: 0 0 8px; border-bottom: 1px solid #333; padding-bottom: 4px;">
    BON DE LIVRAISON – {{name}}
  </h2>
  <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
    <tr><td style="text-align: left; padding: 2px 4px; font-weight: bold;">Atelier</td><td style="text-align: right; padding: 2px 4px;">{{atelier}}</td></tr>
    <tr><td style="text-align: left; padding: 2px 4px; font-weight: bold;">Commande</td><td style="text-align: right; padding: 2px 4px;">{{commande}}</td></tr>
    <tr><td style="text-align: left; padding: 2px 4px; font-weight: bold;">Client</td><td style="text-align: right; padding: 2px 4px;">{{client}}</td></tr>
    <tr><td style="text-align: left; padding: 2px 4px; font-weight: bold;">Désignation</td><td style="text-align: right; padding: 2px 4px;">{{designation}}</td></tr>
    <tr><td style="text-align: left; padding: 2px 4px; font-weight: bold;">Quantité</td><td style="text-align: right; padding: 2px 4px;">{{quantite}}</td></tr>
    <tr><td style="text-align: left; padding: 2px 4px; font-weight: bold;">Date</td><td style="text-align: right; padding: 2px 4px;">{{date}}</td></tr>
  </table>
  <div style="margin-top: 8px; font-size: 10px; border-top: 1px solid #333; padding-top: 4px;">
    Signature : ____________________
  </div>
</div>
`.trim();

// ---------------------------------------------------------------------------
// Placeholder replacement for BonAtelierLine data
// ---------------------------------------------------------------------------
async function replaceBonsAtelierPlaceholders(
  html: string,
  line: BonAtelierLine,
  cmd: BonAtelierCommande,
  atelierCode: string,
  printedQty?: number
): Promise<string> {
  const date = cmd.current_process_datetime
    ? formatDate(cmd.current_process_datetime)
    : "—";

  // Determine the quantity to display:
  // - If printedQty is provided and differs from line.qty, show "partial / total"
  // - Otherwise show the full quantity
  const displayQty =
    printedQty != null && printedQty !== line.qty
      ? `${printedQty} / ${line.qty}`
      : String(line.qty);

  // Process HTML content: decode HTML entities, strip tags, preserve <br/>
  const processHtml = (raw: string): string => {
    if (typeof document === "undefined") return raw;
    const txt = document.createElement("textarea");
    txt.innerHTML = raw;
    return txt.value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/\n/g, "<br/>");
  };

  let result = html
    .replace(/\{\{name\}\}/g, line.product_code ?? cmd.name)
    .replace(/\{\{atelier\}\}/g, atelierCode)
    .replace(/\{\{dimensions\}\}/g, "—")
    .replace(/\{\{surface\}\}/g, "—")
    .replace(/\{\{nature\}\}/g, "—")
    .replace(/\{\{color\}\}/g, "—")
    .replace(/\{\{thickness\}\}/g, "—")
    .replace(/\{\{plies\}\}/g, "—")
    .replace(/\{\{motif\}\}/g, "—")
    .replace(/\{\{commande\}\}/g, cmd.name)
    .replace(/\{\{date\}\}/g, date)
    .replace(/\{\{observation\}\}/g, "—")
    .replace(/\{\{cmd-date\}\}/g, "—")
    .replace(/\{\{client\}\}/g, cmd.partner_name ?? "—")
    .replace(/\{\{designation\}\}/g, processHtml(line.name))
    .replace(/\{\{quantite\}\}/g, displayQty);

  // Handle QR code placeholders (<img data-qr="value" ...>)
  const qrRegex = /<img[^>]*data-qr="([^"]*)"[^>]*>/gi;
  const matches = Array.from(result.matchAll(qrRegex));
  for (const match of matches) {
    const fullMatch = match[0];
    const qrValue = match[1];
    try {
      const dataUrl = await QRCode.toDataURL(qrValue, {
        margin: 1,
        width: 160,
        color: { dark: "#000000", light: "#ffffff" },
      });
      const replaced = fullMatch.replace(
        /src="[^"]*"/i,
        `src="${dataUrl}"`
      );
      result = result.replace(fullMatch, replaced);
    } catch {
      // Leave placeholder as-is if QR generation fails
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Print via hidden iframe + Blob URL (same pattern as CutDetailModal)
// ---------------------------------------------------------------------------
async function printBonsAtelierDelivery(
  line: BonAtelierLine,
  cmd: BonAtelierCommande,
  atelierCode: string,
  printedQty?: number
) {
  // 1. Fetch template from DELIVERY_TEMPLATE variable
  let template = DEFAULT_BONS_ATELIER_TEMPLATE;
  try {
    const res = await fetch("/api/admin/variables?search=DELIVERY_TEMPLATE");
    const data = await res.json();
    if (data.success && data.data.items.length > 0) {
      const saved = data.data.items[0].value;
      if (saved && saved.trim()) {
        template = saved;
      }
    }
  } catch {
    // Fall back to default template
  }

  // 2. Replace placeholders with actual line data
  const html = await replaceBonsAtelierPlaceholders(
    template,
    line,
    cmd,
    atelierCode,
    printedQty
  );

  // 3. Build full HTML document
  const title = `Bon de livraison – ${line.product_code ?? cmd.name}`;
  const fullHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      body { margin: 0; padding: 16px; display: flex; justify-content: center; }
      @media print {
        body { padding: 0; }
      }
    </style>
  </head>
  <body>${html}</body>
</html>`;

  // 4. Create hidden iframe with Blob URL (avoids popup blockers & cross-origin issues)
  const blob = new Blob([fullHtml], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";

  let printed = false;
  iframe.onload = () => {
    if (printed) return;
    printed = true;
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      // Ignore print errors
    }
    // Clean up after print dialog closes
    setTimeout(() => {
      URL.revokeObjectURL(url);
      if (iframe.parentNode) document.body.removeChild(iframe);
    }, 1000);
  };

  iframe.src = url;
  document.body.appendChild(iframe);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface PrintDeliveryButtonProps {
  line: BonAtelierLine;
  cmd: BonAtelierCommande;
  atelierCode: string;
}

export function PrintDeliveryButton({
  line,
  cmd,
  atelierCode,
}: PrintDeliveryButtonProps) {
  const [showQtyModal, setShowQtyModal] = useState(false);
  const [qtyOption, setQtyOption] = useState<'total' | 'partial'>('total');
  const [partialQty, setPartialQty] = useState(1);

  // Reset modal state each time it opens
  useEffect(() => {
    if (showQtyModal) {
      setQtyOption('total');
      setPartialQty(1);
    }
  }, [showQtyModal]);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowQtyModal(false);
    },
    []
  );

  useEffect(() => {
    if (showQtyModal) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [showQtyModal, handleKeyDown]);

  const handlePrint = () => {
    if (qtyOption === 'total') {
      printBonsAtelierDelivery(line, cmd, atelierCode);
    } else {
      const clamped = Math.max(1, Math.min(partialQty, line.qty));
      printBonsAtelierDelivery(line, cmd, atelierCode, clamped);
    }
    setShowQtyModal(false);
  };

  const handleClick = () => {
    if (line.qty === 1) {
      // Direct print for single quantity
      printBonsAtelierDelivery(line, cmd, atelierCode);
    } else {
      // Show quantity chooser modal
      setShowQtyModal(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
        title="طباعة etiquette de livraison"
      >
        <Printer className="h-3.5 w-3.5" />
        <span>طباعة</span>
      </button>

      {/* Quantity chooser modal — shown when line.qty > 1 */}
      {showQtyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowQtyModal(false)}
        >
          <div
            className="relative mx-4 w-full max-w-sm rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h3 className="text-base font-semibold text-slate-800">
                اختيار كمية الطباعة
              </h3>
              <button
                onClick={() => setShowQtyModal(false)}
                className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body — radio buttons + optional input */}
            <div className="space-y-4 px-5 py-4">
              {/* Option 1: full quantity */}
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="qtyOption"
                  value="total"
                  checked={qtyOption === 'total'}
                  onChange={() => setQtyOption('total')}
                  className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-slate-700">
                  Imprimer la quantité totale ({line.qty})
                </span>
              </label>

              {/* Option 2: partial quantity */}
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="qtyOption"
                  value="partial"
                  checked={qtyOption === 'partial'}
                  onChange={() => setQtyOption('partial')}
                  className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-slate-700">
                  Imprimer une quantité partielle
                </span>
              </label>

              {/* Quantity input (only active when 'partial' is selected) */}
              <div className="flex items-center justify-center gap-2 pl-7">
                <input
                  type="number"
                  min={1}
                  max={line.qty}
                  value={partialQty}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      setPartialQty(Math.max(1, Math.min(val, line.qty)));
                    }
                  }}
                  disabled={qtyOption === 'total'}
                  className={`w-20 rounded-md border px-3 py-2 text-center text-sm font-bold text-slate-800 outline-none transition-colors ${
                    qtyOption === 'partial'
                      ? 'border-emerald-400 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                      : 'border-slate-200 bg-slate-50 text-slate-400'
                  }`}
                />
                <span className="text-sm font-medium text-slate-500">
                  / {line.qty}
                </span>
              </div>
            </div>

            {/* Footer — print button */}
            <div className="flex justify-center border-t px-5 py-3">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-6 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
              >
                <Printer className="h-4 w-4" />
                <span>طباعة</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
