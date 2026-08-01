import { VariablesAdmin } from "@/components/auth/VariablesAdmin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Variables — Albelt Stocks",
};

export default function AdminVariablesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Variables
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage application-wide configuration variables.
        </p>
      </div>
      <VariablesAdmin />
    </div>
  );
}