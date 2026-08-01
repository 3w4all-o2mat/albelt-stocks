"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layer, Rect, Stage } from "react-konva";
import type Konva from "konva";
import { X, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { TypeBadge } from "@/components/ui/TypeBadge";
import type { PieceType, StockPiece } from "@/lib/types";
import { TYPE_COLORS } from "@/lib/types";
import { computeScale, formatDimensions, validateCut } from "@/lib/utils";
import { UncutZone } from "@/components/canvas/UncutZone";
import { CutRect } from "@/components/canvas/CutRect";
import { CutTooltip } from "@/components/canvas/CutTooltip";
import { MeterGradations } from "@/components/canvas/MeterGradations";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch " + url);
  return res.json() as Promise<T>;
}

const CUT_TYPES: PieceType[] = ["CC", "CS", "CP"];
const CUT_TYPE_LABELS: Record<PieceType, string> = {
  BO: "",
  CC: "Coupe Commande",
  CS: "Chute Stockée",
  CP: "Chute Perdue",
  SI: "",
};

export function NewCutForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useSearchParams();
  const sourceId = params.get("source_id") ?? "";

  const { data: source, isLoading: sourceLoading, refetch: refetchSource } = useQuery<StockPiece>({
    queryKey: ["piece", sourceId],
    queryFn: () => fetchJson<StockPiece>(`/api/stocks/${sourceId}`),
    enabled: !!sourceId,
  });

  const { data: children = [], refetch: refetchChildren } = useQuery<StockPiece[]>({
    queryKey: ["children", sourceId],
    queryFn: () => fetchJson<StockPiece[]>(`/api/stocks/${sourceId}/children`),
    enabled: !!sourceId,
  });

  const [type, setType] = useState<PieceType>("CC");
  // For CC cuts the displayed/stored longueur = longueur_origine + longueur_dx.
  // For CS/CP cuts (no commande) the user enters longueur directly.
  const [longueurOrigine, setLongueurOrigine] = useState<number | null>(null);
  const [longueurDx, setLongueurDx] = useState<string>("0");
  const [longueurManual, setLongueurManual] = useState<string>("");
  const [largeur, setLargeur] = useState("");
  const [cute_x, setCuteX] = useState("0");
  const [cute_y, setCuteY] = useState("0");
  const [cmd_name, setCmdName] = useState("");
  const [cmd_id, setCmdId] = useState("");
  const [line_id, setLineId] = useState<number | null>(null);
  const [observation, setObservation] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [commandeModalOpen, setCommandeModalOpen] = useState(false);
  const [commandeData, setCommandeData] = useState<CommandeInfo | null>(null);
  const [commandeLoading, setCommandeLoading] = useState(false);
  const [commandeError, setCommandeError] = useState<string | null>(null);
  const [selectedLine, setSelectedLine] = useState<{ name: string; qty: number; largeur: number } | null>(null);

  async function handleChoisirCommande() {
    if (!cmd_name.trim()) return;
    setCommandeLoading(true);
    setCommandeError(null);
    setCommandeData(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(
        `/api/odoo/commande?name=${encodeURIComponent(cmd_name.trim())}`,
        { signal: controller.signal }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        setCommandeError(json.error ?? "Erreur lors de la recherche.");
        setCommandeModalOpen(true);
        return;
      }
      setCommandeData(json.data as CommandeInfo);
      setCommandeModalOpen(true);
    } catch {
      setCommandeError("Erreur serveur. Veuillez réessayer.");
      setCommandeModalOpen(true);
    } finally {
      clearTimeout(timeout);
      setCommandeLoading(false);
    }
  }

  function handleChooseLine(line: { id: number; name: string; qty: number; commande_id: number; longueur: number | null; largeur: number | null }) {
    setCmdId(String(line.commande_id));
    setCmdName(commandeData?.name ?? "");
    setLineId(line.id);
    // Prefer the Odoo line's largeur column; fall back to extracting from the
    // rich-text line.name ("Largeur: 390mm") for older rows that lack it.
    let largeur = line.largeur != null ? Number(line.largeur) : 0;
    if (!largeur) {
      const largeurMatch = line.name.match(/Largeur:\s*(\d+)/i);
      largeur = largeurMatch ? parseInt(largeurMatch[1], 10) : 0;
    }
    setSelectedLine({ name: line.name, qty: line.qty, largeur });
    if (largeur > 0) {
      setLargeur(String(largeur));
    }
    // Populate longueur_origine from the Odoo line (per-line, 100% populated
    // in practice — unlike sn_sales_commandes.longueur which is always NULL).
    setLongueurOrigine(line.longueur != null ? Number(line.longueur) : null);
    setLongueurDx("0");
    setCommandeModalOpen(false);
  }

  const nums = useMemo(() => {
    const lo = longueurOrigine ?? 0;
    const ldx = Number(longueurDx) || 0;
    const autoLongueur = lo + ldx; // CC path: origine + dx
    const manualLongueur = Number(longueurManual) || 0; // CS/CP path
    return {
      longueur: type === "CC" ? autoLongueur : manualLongueur,
      largeur: Number(largeur) || 0,
      cute_x: Number(cute_x) || 0,
      cute_y: Number(cute_y) || 0,
    };
  }, [type, longueurOrigine, longueurDx, longueurManual, largeur, cute_x, cute_y]);

  const validation = useMemo(() => {
    if (!source) return { ok: false, error: "Source introuvable" };
    return validateCut(
      nums.cute_x,
      nums.cute_y,
      nums.longueur,
      nums.largeur,
      source.longueur,
      source.largeur,
      children
    );
  }, [source, nums, children]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/cuts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          stk_category_id: source?.stk_category_id,
          parent_id: Number(sourceId),
          longueur: nums.longueur,
          largeur: nums.largeur,
          cute_x: nums.cute_x,
          cute_y: nums.cute_y,
          cmd_id: cmd_id ? Number(cmd_id) : null,
          cmd_name: cmd_name || null,
          line_id: line_id,
          longueur_dx: type === "CC" ? (Number(longueurDx) || 0) : 0,
          observation: observation || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erreur lors de la création");
      }
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["piece", sourceId] });
      await queryClient.invalidateQueries({ queryKey: ["children", sourceId] });
      const redirectPath =
        source?.type === "CS" ? `/falls/${sourceId}` : `/coils/${sourceId}`;
      // Full navigation to force a fresh server render after the DB update
      window.location.href = redirectPath;
    },
    onError: (e: Error) => setError(e.message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!source) {
      setError("Source manquante.");
      return;
    }
    if (!validation.ok) {
      setError(validation.error ?? "Coupe invalide.");
      return;
    }
    if (type === "CC" && !cmd_name.trim()) {
      setError("Le nom de commande est requis pour une coupe de type CC.");
      return;
    }
    mutation.mutate();
  }

  if (!sourceId) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-slate-600">
            Aucune source sélectionnée. Passez par la page d&apos;une bobine ou
            d&apos;une chute pour enregistrer une coupe.
          </p>
        </CardBody>
      </Card>
    );
  }

  if (sourceLoading) {
    return <p className="text-sm text-slate-500">Chargement de la source…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader
          title="Nouvelle coupe"
          subtitle={
            source
              ? `Source : ${source.name ?? "#" + source.id} · ${formatDimensions(
                  source.longueur,
                  source.largeur
                )}`
              : undefined
          }
        />
        <CardBody>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Type de coupe">
                <div className="flex gap-2">
                  {CUT_TYPES.map((t) => {
                    const colorMap: Record<PieceType, { active: string; inactive: string }> = {
                      BO: { active: "", inactive: "" },
                      CC: {
                        active: "border-blue-600 bg-blue-600 text-white",
                        inactive: "border-blue-300 bg-white text-blue-700 hover:bg-blue-50",
                      },
                      CS: {
                        active: "border-orange-500 bg-orange-500 text-white",
                        inactive: "border-orange-300 bg-white text-orange-700 hover:bg-orange-50",
                      },
                      CP: {
                        active: "border-red-600 bg-red-600 text-white",
                        inactive: "border-red-300 bg-white text-red-700 hover:bg-red-50",
                      },
                      SI: { active: "", inactive: "" },
                    };
                    const colors = colorMap[t];
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          if (t !== type) {
                            // Reset longueur state when switching type to
                            // avoid stale values from the previous path.
                            setLongueurOrigine(null);
                            setLongueurDx("0");
                            setLongueurManual("");
                          }
                          setType(t);
                        }}
                        className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition ${
                          type === t ? colors.active : colors.inactive
                        }`}
                      >
                        {CUT_TYPE_LABELS[t]}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>

            {type === "CC" && (
              <>
                <Field label="Nom de commande">
                  <Input
                    value={cmd_name}
                    onChange={(e) => setCmdName(e.target.value)}
                    required
                  />
                </Field>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">
                    Commande
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="bg-cyan-500 text-black hover:bg-cyan-600"
                      disabled={!cmd_name.trim() || commandeLoading}
                      onClick={handleChoisirCommande}
                    >
                      {commandeLoading ? (
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      Appeler la commande
                    </Button>

                  </div>
                </div>
              </>
            )}

            {selectedLine && (
              <div className="sm:col-span-2 rounded-lg border border-blue-200 bg-blue-50/70 p-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span
                      className="text-blue-900"
                      dangerouslySetInnerHTML={{
                        __html: selectedLine.name.replace(/\n/g, "<br />"),
                      }}
                    />
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Quantité :</span>{" "}
                    <span className="text-blue-900">{selectedLine.qty}</span>
                  </div>
                </div>
              </div>
            )}

            {type === "CC" && (
              <>
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Field label="Longueur d'origine (mm)">
                    <Input
                      type="number"
                      value={longueurOrigine != null ? String(longueurOrigine) : ""}
                      readOnly
                      disabled
                      placeholder={longueurOrigine == null ? "Choisir une ligne" : ""}
                      className="bg-slate-50 text-slate-600"
                    />
                  </Field>
                  <Field
                    label="Longueur DX (mm)"
                    hint="Longueur exacte côté droit (ajustement opérateur)"
                  >
                    <Input
                      type="number"
                      min={0}
                      value={longueurDx}
                      onChange={(e) => setLongueurDx(e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Longueur (mm)"
                    hint="longueur_origine + longueur_dx"
                  >
                    <Input
                      type="number"
                      min={1}
                      value={nums.longueur > 0 ? String(nums.longueur) : ""}
                      readOnly
                      disabled
                      required
                      className="bg-slate-50 text-slate-700 font-semibold"
                    />
                  </Field>
                  <Field
                    label="Largeur (mm)"
                    hint="Définie par la ligne de commande"
                  >
                    <Input
                      type="number"
                      min={1}
                      value={largeur}
                      readOnly
                      disabled
                      required
                      className="bg-slate-50 text-slate-700 font-semibold"
                    />
                  </Field>
                </div>
              </>
            )}

            {type !== "CC" && (
              <>
                <Field
                  label="Longueur (mm)"
                >
                  <Input
                    type="number"
                    min={1}
                    value={longueurManual}
                    onChange={(e) => setLongueurManual(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Largeur (mm)">
                  <Input
                    type="number"
                    min={1}
                    value={largeur}
                    onChange={(e) => setLargeur(e.target.value)}
                    required
                  />
                </Field>
              </>
            )}
            <Field label="Position X (mm)">
              <Input
                type="number"
                min={0}
                value={cute_x}
                onChange={(e) => setCuteX(e.target.value)}
                required
              />
            </Field>
            <Field label="Position Y (mm)">
              <Input
                type="number"
                min={0}
                value={cute_y}
                onChange={(e) => setCuteY(e.target.value)}
                required
              />
            </Field>

            <div className="sm:col-span-2">
              <Field
                label="Observation"
                hint={type === "CP" ? "Raison de la perte" : "Optionnel"}
              >
                <Textarea
                  rows={2}
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                />
              </Field>
            </div>

            {!validation.ok && (
              <p className="sm:col-span-2 rounded-md bg-cp/10 px-3 py-2 text-sm text-cp">
                {validation.error}
              </p>
            )}
            {error && (
              <p className="sm:col-span-2 rounded-md bg-cp/10 px-3 py-2 text-sm text-cp">
                {error}
              </p>
            )}

            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.back()}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending || !validation.ok}
              >
                {mutation.isPending ? "Enregistrement…" : "Enregistrer la coupe"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Aperçu live"
          subtitle="Position de la coupe sur la source"
          action={source && <TypeBadge type={source.type} />}
        />
        <CardBody>
          {source && (
            <PreviewCanvas
              source={source}
              children_={children}
              cut={{
                longueur: nums.longueur,
                largeur: nums.largeur,
                cute_x: nums.cute_x,
                cute_y: nums.cute_y,
                type,
              }}
              onDragEnd={(x, y) => {
                setCuteX(String(Math.max(0, Math.round(x))));
                setCuteY(String(Math.max(0, Math.round(y))));
              }}
            />
          )}
        </CardBody>
      </Card>

      {commandeModalOpen && (
        <CommandeDetailModal
          data={commandeData}
          error={commandeError}
          loading={commandeLoading}
          onClose={() => {
            setCommandeModalOpen(false);
            setCommandeError(null);
          }}
          onChooseLine={handleChooseLine}
        />
      )}
    </div>
  );
}

function PreviewCanvas({
  source,
  children_,
  cut,
  onDragEnd,
}: {
  source: StockPiece;
  children_: StockPiece[];
  cut: {
    longueur: number;
    largeur: number;
    cute_x: number;
    cute_y: number;
    type: PieceType;
  };
  onDragEnd: (x: number, y: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [size, setSize] = useState({ width: 600, height: 400 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState<{
    piece: StockPiece | null;
    x: number;
    y: number;
  }>({ piece: null, x: 0, y: 0 });

  const PADDING = 60;

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        setSize({ width: w, height: Math.max(300, w * 0.6) });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const baseScale = useMemo(
    () =>
      computeScale(
        source.longueur,
        source.largeur,
        size.width - PADDING * 2,
        size.height - PADDING * 2
      ),
    [source.longueur, source.largeur, size]
  );

  const effectiveScale = baseScale * zoom;
  const ready = size.width > 0 && baseScale > 0;

  const rootW = source.longueur * effectiveScale;
  const rootH = source.largeur * effectiveScale;
  const offsetX = (size.width - rootW) / 2 + pan.x;
  const offsetY = (size.height - rootH) / 2 + pan.y;

  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    if (e.evt.ctrlKey) {
      const factor = e.evt.deltaY > 0 ? 0.9 : 1.1;
      setZoom((z) => Math.min(10, Math.max(0.2, z * factor)));
    } else {
      setPan((p) => ({
        x: p.x - e.evt.deltaX,
        y: p.y - e.evt.deltaY,
      }));
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
      style={{ height: size.height }}
    >
      {ready && (
        <>
          <Stage
            ref={stageRef}
            width={size.width}
            height={size.height}
            onWheel={handleWheel}
          >
            <Layer>
              {/* Meter gradations (rulers) */}
              <MeterGradations
                offsetX={offsetX}
                offsetY={offsetY}
                rootW={rootW}
                rootH={rootH}
                longueurMm={source.longueur}
                largeurMm={source.largeur}
                scale={effectiveScale}
              />

              {/* Uncut background */}
              <UncutZone
                x={offsetX}
                y={offsetY}
                width={rootW}
                height={rootH}
              />

              {/* Source border */}
              <Rect
                x={offsetX}
                y={offsetY}
                width={rootW}
                height={rootH}
                stroke="#1F2937"
                strokeWidth={2}
                listening={false}
                cornerRadius={3}
              />

              {/* Existing children cuts */}
              {children_.map((child) => (
                <CutRect
                  key={child.id}
                  piece={child}
                  scale={effectiveScale}
                  offsetX={offsetX}
                  offsetY={offsetY}
                  onHover={(piece, x, y) =>
                    setHover({ piece, x, y })
                  }
                  onClick={() => {}}
                />
              ))}

              {/* New cut – draggable black rectangle */}
              {cut.longueur > 0 && cut.largeur > 0 && (
                <Rect
                  x={offsetX + cut.cute_x * effectiveScale}
                  y={offsetY + cut.cute_y * effectiveScale}
                  width={cut.longueur * effectiveScale}
                  height={cut.largeur * effectiveScale}
                  fill="#111827"
                  opacity={0.85}
                  stroke="#000"
                  strokeWidth={2}
                  cornerRadius={2}
                  draggable
                  dragBoundFunc={(boundPos) => {
                    let mmX = (boundPos.x - offsetX) / effectiveScale;
                    let mmY = (boundPos.y - offsetY) / effectiveScale;
                    mmX = Math.max(
                      0,
                      Math.min(source.longueur - cut.longueur, mmX)
                    );
                    mmY = Math.max(
                      0,
                      Math.min(source.largeur - cut.largeur, mmY)
                    );
                    return {
                      x: offsetX + mmX * effectiveScale,
                      y: offsetY + mmY * effectiveScale,
                    };
                  }}
                  onDragEnd={(e) => {
                    const mmX = (e.target.x() - offsetX) / effectiveScale;
                    const mmY = (e.target.y() - offsetY) / effectiveScale;
                    onDragEnd(
                      Math.max(
                        0,
                        Math.min(source.longueur - cut.longueur, mmX)
                      ),
                      Math.max(
                        0,
                        Math.min(source.largeur - cut.largeur, mmY)
                      )
                    );
                  }}
                />
              )}
            </Layer>
          </Stage>

          {/* Tooltip for hovered children */}
          <CutTooltip
            piece={hover.piece}
            x={hover.x}
            y={hover.y}
          />

          {/* Legend */}
          <div className="absolute left-3 top-3 flex flex-wrap items-center gap-3 rounded-md bg-white/90 px-3 py-1.5 text-xs shadow">
            <Legend color="#3B82F6" label="CC" />
            <Legend color="#F59E0B" label="CS" />
            <Legend color="#EF4444" label="CP" />
            <Legend color="#111827" label="Nouvelle" />
            <Legend color="#E5E7EB" label="Non coupé" />
          </div>

          {/* Zoom controls */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-md bg-white/90 px-2 py-1 text-xs text-slate-600 shadow">
            <button
              className="px-1.5 hover:text-slate-900"
              onClick={() => setZoom((z) => Math.min(10, z * 1.2))}
            >
              +
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button
              className="px-1.5 hover:text-slate-900"
              onClick={() => setZoom((z) => Math.max(0.2, z / 1.2))}
            >
              −
            </button>
            <button
              className="ml-1 text-slate-400 hover:text-slate-900"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
            >
              reset
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-slate-600">
      <span
        className="inline-block h-3 w-3 rounded-sm border border-slate-300"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CommandeInfo {
  id: number;
  name: string;
  state: string;
  creation_date: string | null;
  confirmation_date: string | null;
  amount_ht: string | null;
  amount_ttc: string | null;
  amount_tva: string | null;
  longueur: number | null;
  largeur: number | null;
  atelier: string | null;
  partner: {
    id: number;
    name: string;
    display_name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
  };
  lines: Array<{
    id: number;
    name: string;
    qty: number;
    commande_id: number;
    longueur: number | null;
    largeur: number | null;
  }>;
}

// ---------------------------------------------------------------------------
// Commande Detail Modal
// ---------------------------------------------------------------------------

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

function CommandeDetailModal({
  data,
  error,
  loading,
  onClose,
  onChooseLine,
}: {
  data: CommandeInfo | null;
  error: string | null;
  loading: boolean;
  onClose: () => void;
  onChooseLine: (line: {
    id: number;
    name: string;
    qty: number;
    commande_id: number;
    longueur: number | null;
    largeur: number | null;
  }) => void;
}) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (loading || data || error) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [loading, data, error, handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative mx-4 max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-blue-700 bg-blue-600 px-6 py-3">
          <h2 className="text-lg font-semibold text-white">
            {data ? data.name : "Recherche commande"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-blue-100 transition-colors hover:bg-blue-500 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
            </div>
          )}

          {error && !loading && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {data && !loading && (
            <div className="space-y-4">
              {/* Client info */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-purple-400">
                  Client
                </h3>
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-1">
                  <DetailRow label="Nom" value={data.partner.display_name || data.partner.name} />
                  <DetailRow
                    label="Date confirmation"
                    value={
                      data.confirmation_date
                        ? new Date(data.confirmation_date).toLocaleDateString("fr-FR")
                        : null
                    }
                  />
                </div>
              </div>

              {/* Lignes de commande */}
              {data.lines.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-purple-400">
                    Lignes de commande
                  </h3>
                  <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-1">
                    {data.lines.map((line) => (
                      <div
                        key={line.id}
                        className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0 gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="text-xs font-mono text-slate-400 shrink-0">
                            #{line.id}
                          </span>
                          <span
                            className="text-sm text-slate-900"
                            dangerouslySetInnerHTML={{
                              __html: line.name.replace(/\n/g, "<br>"),
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-medium text-slate-700">
                            {line.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => onChooseLine(line)}
                            className="inline-flex items-center gap-1 rounded-md border border-blue-300 bg-white px-3 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
                          >
                            Choisir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
