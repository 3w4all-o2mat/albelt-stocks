"use client";

import { useEffect, useCallback } from "react";
import Link from "next/link";
import { X, Printer, ExternalLink } from "lucide-react";
import QRCode from "qrcode";
import type { StockPiece, Category } from "@/lib/types";
import { formatDimensions, formatSurface, formatDate } from "@/lib/utils";

interface CutDetailModalProps {
  cut: StockPiece | null;
  isOpen: boolean;
  onClose: () => void;
  hideDeliveryButton?: boolean;
  hideCommandSection?: boolean;
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-2 last:border-0">
      <span className="text-sm font-medium text-slate-500">{label}</span>
      <span className="text-sm text-slate-900">{value ?? "—"}</span>
    </div>
  );
}

export default function CutDetailModal({
  cut,
  isOpen,
  onClose,
  hideDeliveryButton = false,
  hideCommandSection = false,
}: CutDetailModalProps) {
  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !cut) return null;

  const category = cut.category as Category | undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative mx-4 max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between border-b px-6 py-2 ${
            cut.type === "CC"
              ? "border-blue-700 bg-blue-600"
              : cut.type === "CP"
              ? "border-red-700 bg-red-600"
              : cut.type === "CS"
              ? "border-orange-700 bg-orange-600"
              : cut.type === "BO"
              ? "border-purple-700 bg-purple-600"
              : cut.type === "SI"
              ? "border-green-700 bg-green-600"
              : "border-slate-200"
          }`}
        >
          <h2
            className={`text-lg font-semibold ${
              cut.type === "CC" || cut.type === "CP" || cut.type === "CS" || cut.type === "BO" || cut.type === "SI" ? "text-white" : "text-slate-900"
            }`}
          >
            {cut.name ?? `#${cut.id}`}
          </h2>
          <button
            onClick={onClose}
            className={`rounded-full p-1 transition-colors ${
              cut.type === "CC"
                ? "text-blue-100 hover:bg-blue-500 hover:text-white"
                : cut.type === "CP"
                ? "text-red-100 hover:bg-red-500 hover:text-white"
                : cut.type === "CS"
                ? "text-orange-100 hover:bg-orange-500 hover:text-white"
                : cut.type === "BO"
                ? "text-purple-100 hover:bg-purple-500 hover:text-white"
                : cut.type === "SI"
                ? "text-green-100 hover:bg-green-500 hover:text-white"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pt-4 pb-2">
          <style>{`
            .container-masonry { display: flex; gap: var(--gap-h); }
            .column { display: flex; flex: 1; flex-direction: column; gap: var(--gap-v); }
          `}</style>
          <div className="container-masonry" style={{ "--gap-h": "1rem", "--gap-v": "1rem" } as React.CSSProperties}>
            <div className="column">
              {/* General info */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-purple-400">
                  Informations générales
                </h3>
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-1">
                  <DetailRow label="Nom" value={cut.name} />
                  <DetailRow label="Atelier" value={cut.atelier} />
                  <DetailRow label="Créé le" value={formatDate(cut.create_date)} />
                </div>
              </div>

              {/* Catégorie */}
              {category && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-purple-400">
                    Catégorie
                  </h3>
                  <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-1">
                    <DetailRow label="Nature" value={category.nature} />
                    <DetailRow label="Couleur" value={category.color} />
                    <DetailRow label="Épaisseur" value={category.thickness} />
                    <DetailRow label="Plis" value={category.plies} />
                    <DetailRow label="Motif" value={category.motif} />
                  </div>
                </div>
              )}
            </div>

            <div className="column">
              {/* Dimensions */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-purple-400">
                  Dimensions
                </h3>
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-1">
                  <DetailRow
                    label="Dimensions"
                    value={formatDimensions(cut.longueur, cut.largeur)}
                  />
                  <DetailRow label="Surface" value={formatSurface(cut.surface)} />
                </div>
              </div>

              {/* Source / Année — uniquement pour les bobines (BO) */}
              {cut.type === "BO" && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-purple-400">
                    SOURCE/ANNÉE
                  </h3>
                  <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-1">
                    <DetailRow label="Fournisseur" value={cut.supplier?.name} />
                    <DetailRow label="Année" value={cut.year} />
                  </div>
                </div>
              )}

              {!hideCommandSection && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-purple-400">
                    Commande
                  </h3>
                  <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-1">
                    <DetailRow label="Commande" value={cut.cmd_name} />
                    {cut.cmd_id != null && (
                      <>
                        <DetailRow label="Client" value={cut.client_name} />
                        <DetailRow label="Quantité" value={cut.line_qty} />
                        {cut.line_designation && (
                          <div className="border-b border-slate-100 py-2 last:border-0">
                            <span
                              className="text-sm text-slate-900"
                              dangerouslySetInnerHTML={{
                                __html: cut.line_designation.replace(/\n/g, "<br />"),
                              }}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer with print buttons */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-3">
          {cut.type === "CS" ? (
            <Link
              href={`/cs/${cut.id}`}
              className="inline-flex items-center gap-2 rounded-md border border-orange-700 bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Voir détails
            </Link>
          ) : cut.type === "SI" ? (
            <Link
              href={`/si/${cut.id}`}
              className="inline-flex items-center gap-2 rounded-md border border-green-700 bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Voir détails
            </Link>
          ) : cut.type === "BO" ? (
            <Link
              href={`/coils/${cut.id}`}
              className="inline-flex items-center gap-2 rounded-md border border-purple-700 bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Voir détails
            </Link>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            {!hideDeliveryButton && (
              <button
                onClick={() => printDeliveryLabel(cut, category)}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Printer className="h-4 w-4" />
                Imprimer l&apos;étiquette de livraison
              </button>
            )}
            <button
              onClick={() => printLabel(cut, category)}
              className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
            >
              <Printer className="h-4 w-4" />
              Imprimer l&apos;étiquette de stockage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Label printing helpers
// ---------------------------------------------------------------------------

const DEFAULT_TEMPLATE = `
<div style="font-family: Arial, sans-serif; max-width: 300px; border: 1px solid #000; padding: 12px; text-align: center;">
  <h2 style="font-size: 14px; margin: 0 0 8px; border-bottom: 1px solid #333; padding-bottom: 4px;">
    ALBELT – {{name}}
  </h2>
  <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
    <tr><td style="text-align: left; padding: 2px 4px; font-weight: bold;">Atelier</td><td style="text-align: right; padding: 2px 4px;">{{atelier}}</td></tr>
    <tr><td style="text-align: left; padding: 2px 4px; font-weight: bold;">Dimensions</td><td style="text-align: right; padding: 2px 4px;">{{dimensions}}</td></tr>
    <tr><td style="text-align: left; padding: 2px 4px; font-weight: bold;">Surface</td><td style="text-align: right; padding: 2px 4px;">{{surface}}</td></tr>
    <tr><td style="text-align: left; padding: 2px 4px; font-weight: bold;">Nature</td><td style="text-align: right; padding: 2px 4px;">{{nature}}</td></tr>
    <tr><td style="text-align: left; padding: 2px 4px; font-weight: bold;">Couleur</td><td style="text-align: right; padding: 2px 4px;">{{color}}</td></tr>
    <tr><td style="text-align: left; padding: 2px 4px; font-weight: bold;">Épaisseur</td><td style="text-align: right; padding: 2px 4px;">{{thickness}}</td></tr>
    <tr><td style="text-align: left; padding: 2px 4px; font-weight: bold;">Plis</td><td style="text-align: right; padding: 2px 4px;">{{plies}}</td></tr>
    <tr><td style="text-align: left; padding: 2px 4px; font-weight: bold;">Motif</td><td style="text-align: right; padding: 2px 4px;">{{motif}}</td></tr>
    <tr><td style="text-align: left; padding: 2px 4px; font-weight: bold;">Commande</td><td style="text-align: right; padding: 2px 4px;">{{commande}}</td></tr>
    <tr><td style="text-align: left; padding: 2px 4px; font-weight: bold;">Date</td><td style="text-align: right; padding: 2px 4px;">{{date}}</td></tr>
  </table>
</div>
`;

async function replacePlaceholders(
  html: string,
  cut: StockPiece,
  category?: Category
): Promise<string> {
  const cat = category;
  const labelSize = cut.longueur && cut.largeur
    ? formatDimensions(cut.longueur, cut.largeur)
    : "—";
  const surface = cut.surface != null
    ? formatSurface(cut.surface)
    : "—";
  const date = cut.create_date
    ? formatDate(cut.create_date)
    : "—";

  let result = html
    .replace(/\{\{name\}\}/g, cut.name ?? `#${cut.id}`)
    .replace(/\{\{atelier\}\}/g, cut.atelier ?? "—")
    .replace(/\{\{dimensions\}\}/g, labelSize)
    .replace(/\{\{surface\}\}/g, surface)
    .replace(/\{\{nature\}\}/g, cat?.nature ?? "—")
    .replace(/\{\{color\}\}/g, cat?.color ?? "—")
    .replace(/\{\{thickness\}\}/g, cat?.thickness ?? "—")
    .replace(/\{\{plies\}\}/g, cat?.plies ?? "—")
    .replace(/\{\{motif\}\}/g, cat?.motif ?? "—")
    .replace(/\{\{commande\}\}/g, cut.cmd_name ?? "—")
    .replace(/\{\{cmd-date\}\}/g, cut.cmd_date ? formatDate(cut.cmd_date) : "—")
    .replace(/\{\{client\}\}/g, cut.client_name ?? "—")
    .replace(/\{\{designation\}\}/g, cut.line_designation ?? "—")
    .replace(/\{\{quantite\}\}/g, cut.line_qty != null ? String(cut.line_qty) : "—")
    .replace(/\{\{date\}\}/g, date)
    .replace(/\{\{observation\}\}/g, cut.observation ?? "—");

  // Replace QR code placeholders (<img data-qr="value" ...>) with real QR data URLs
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
      // Preserve original style/attributes but swap the src
      const replaced = fullMatch.replace(
        /src="[^"]*"/i,
        `src="${dataUrl}"`
      );
      result = result.replace(fullMatch, replaced);
    } catch {
      // If QR generation fails, leave the placeholder as-is
    }
  }

  return result;
}

function printLabel(cut: StockPiece, category?: Category) {
  // Use a hidden iframe to print — avoids popup blocking and cross-origin issues
  loadAndPrint(cut, category);
}

async function loadAndPrint(cut: StockPiece, category?: Category) {
  let template = DEFAULT_TEMPLATE;
  try {
    const res = await fetch("/api/admin/variables?search=LABEL_TEMPLATE");
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

  const html = await replacePlaceholders(template, cut, category);

  // Build the full HTML document for the label
  const fullHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Étiquette – ${cut.name ?? `#${cut.id}`}</title>
    <style>
      body { margin: 0; padding: 16px; display: flex; justify-content: center; }
      @media print {
        body { padding: 0; }
      }
    </style>
  </head>
  <body>${html}</body>
</html>`;

  // Create a hidden iframe and load the label HTML via a Blob URL
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
    // Clean up after a delay to let the print dialog finish
    setTimeout(() => {
      URL.revokeObjectURL(url);
      if (iframe.parentNode) document.body.removeChild(iframe);
    }, 1000);
  };

  iframe.src = url;
  document.body.appendChild(iframe);
}

function printDeliveryLabel(cut: StockPiece, category?: Category) {
  loadAndPrintDelivery(cut, category);
}

async function loadAndPrintDelivery(cut: StockPiece, category?: Category) {
  let template = DEFAULT_TEMPLATE;
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

  const html = await replacePlaceholders(template, cut, category);

  const fullHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Bon de livraison – ${cut.name ?? `#${cut.id}`}</title>
    <style>
      body { margin: 0; padding: 16px; display: flex; justify-content: center; }
      @media print {
        body { padding: 0; }
      }
    </style>
  </head>
  <body>${html}</body>
</html>`;

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
    setTimeout(() => {
      URL.revokeObjectURL(url);
      if (iframe.parentNode) document.body.removeChild(iframe);
    }, 1000);
  };

  iframe.src = url;
  document.body.appendChild(iframe);
}
