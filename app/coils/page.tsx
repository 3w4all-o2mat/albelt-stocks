import Link from "next/link";
import { Plus, ChevronDown, Filter } from "lucide-react";
import { requirePageAuth } from "@/lib/auth/guard";
import { getAllBOs, getDistinctBOYears } from "@/lib/queries/stocks";
import { getAllCategories } from "@/lib/queries/categories";
import { listAteliersForUser } from "@/lib/queries/ateliers";
import { listActiveSuppliers } from "@/lib/queries/suppliers";
import { listCountries } from "@/lib/queries/countries";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { AtelierFilter } from "@/components/ui/AtelierFilter";
import {
  ConsumedFilter,
  type ConsumedFilterValue,
} from "@/components/ui/ConsumedFilter";
import { DropdownFilter } from "@/components/ui/DropdownFilter";
import { ResetFiltersButton } from "@/components/ui/ResetFiltersButton";
import CoilsTable from "@/components/cuts/CoilsTable";
import {
  NATURE_OPTIONS,
  COLOR_OPTIONS,
  PLIES_OPTIONS,
  THICKNESS_OPTIONS,
} from "@/lib/bobine-category-options";

export const dynamic = "force-dynamic";

export default async function CoilsPage({
  searchParams,
}: {
  searchParams?: {
    atelier?: string;
    consumed?: string;
    nature?: string;
    color?: string;
    plies?: string;
    thickness?: string;
    supplier?: string;
    country?: string;
    year?: string;
  };
}) {
  const user = await requirePageAuth();
  const allowedAteliers = await listAteliersForUser(
    user.id,
    user.role,
    { pageSize: 100 }
  );
  const allowedNames = allowedAteliers.map((a) => a.name);

  let atelier = searchParams?.atelier?.trim() || null;
  if (atelier && !allowedNames.includes(atelier)) {
    atelier = null;
  }

  const consumedRaw = searchParams?.consumed?.trim();
  const consumed: ConsumedFilterValue =
    consumedRaw === "consumed" || consumedRaw === "all"
      ? consumedRaw
      : "active";

  // Advanced filters
  const nature = searchParams?.nature?.trim() || null;
  const color = searchParams?.color?.trim() || null;
  const plies = searchParams?.plies?.trim() || null;
  const thickness = searchParams?.thickness?.trim() || null;
  const supplier = searchParams?.supplier?.trim() || null;
  const country = searchParams?.country?.trim() || null;
  const year = searchParams?.year?.trim() || null;

  const [bos, categories, suppliers, countries, years] = await Promise.all([
    getAllBOs(atelier, consumed, allowedNames, {
      nature: nature ?? undefined,
      color: color ?? undefined,
      plies: plies ?? undefined,
      thickness: thickness ?? undefined,
      supplierId: supplier ? Number(supplier) : undefined,
      countryCode: country ?? undefined,
      year: year ? Number(year) : undefined,
    }),
    getAllCategories(),
    listActiveSuppliers(),
    listCountries(),
    getDistinctBOYears(),
  ]);
  const ateliers = allowedAteliers;

  // Build dropdown option lists
  const supplierOptions = suppliers.map((s) => ({
    value: String(s.id),
    label: s.name + (s.country_name ? ` (${s.country_name})` : ""),
  }));
  const countryOptions = countries.map((c) => ({
    value: c.code,
    label: c.name_fr,
  }));
  const yearOptions = years.map((y) => ({
    value: String(y),
    label: String(y),
  }));
  const natureOptions = NATURE_OPTIONS.map((o) => ({ value: o.label, label: o.label }));
  const colorOptions = COLOR_OPTIONS.map((o) => ({ value: o.label, label: o.label }));
  const pliesOptions = PLIES_OPTIONS.map((o) => ({ value: o.label, label: o.label }));
  const thicknessOptions = THICKNESS_OPTIONS.map((o) => ({ value: o.label, label: o.label }));

  const activeFilterCount = [nature, color, plies, thickness, supplier, country, year].filter(Boolean).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-purple-700">Bobines</h1>
          <p className="mt-1 text-sm text-slate-500">
            {bos.length} bobine(s) source enregistrée(s)
            {atelier ? ` · ${atelier}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ConsumedFilter value={consumed} />
          <AtelierFilter ateliers={ateliers} />
          <Link href={atelier ? `/coils/new?atelier=${encodeURIComponent(atelier)}` : "/coils/new"}>
            <Button>
              <Plus className="h-4 w-4" /> Nouvelle bobine
            </Button>
          </Link>
        </div>
      </div>

      {/* Advanced filters — collapsible card section */}
      <Card className="mt-6">
        <details className="group" open={activeFilterCount > 0}>
          <summary className="flex cursor-pointer items-center justify-between px-5 py-4 border-b border-slate-100 list-none [&::-webkit-details-marker]:hidden">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-cyan-500" />
              <h3 className="text-base font-semibold text-cyan-500">Filtres avancés</h3>
              <p className="mt-0.5 text-sm text-slate-500">Affinez la liste des bobines par catégorie, fournisseur ou année</p>
            </div>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-purple-100 px-1.5 text-xs font-medium text-purple-700">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
            </div>
          </summary>
          <CardBody>
            <div className="flex flex-wrap items-center gap-2 justify-center">
              <DropdownFilter paramKey="nature" label="Toutes les natures" options={natureOptions} />
              <DropdownFilter paramKey="color" label="Toutes les couleurs" options={colorOptions} />
              <DropdownFilter paramKey="plies" label="Tous les plis" options={pliesOptions} />
              <DropdownFilter paramKey="thickness" label="Toutes les épaisseurs" options={thicknessOptions} />
              <DropdownFilter paramKey="supplier" label="Tous les fournisseurs" options={supplierOptions} />
              <DropdownFilter paramKey="country" label="Tous les pays" options={countryOptions} />
              <DropdownFilter paramKey="year" label="Toutes les années" options={yearOptions} />
              {activeFilterCount > 0 && (
                <ResetFiltersButton />
              )}
            </div>
          </CardBody>
        </details>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Toutes les bobines" subtitle="Cliquez pour ouvrir le détail et le canvas 2D" titleClassName="text-purple-500" />
        <CoilsTable bos={bos} />
      </Card>

      {categories.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Catégories disponibles" titleClassName="text-purple-500" />
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs"
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: c.color || "#94a3b8" }}
                  />
                  {c.name} · {c.nature} · {c.thickness} · {c.plies} plis
                </span>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
