import { Suspense } from "react";
import { requirePageAuth } from "@/lib/auth/guard";
import { NewCutForm } from "@/components/forms/NewCutForm";

export const dynamic = "force-dynamic";

export default async function NewCutPage() {
  await requirePageAuth();
  return (
    <div className="mx-auto max-w-7xl px-4 py-2">
      <h1 className="text-2xl font-bold tracking-tight text-purple-700">Nouvelle coupe</h1>
      <p className="mt-1 text-sm text-slate-500">
        Enregistrez une coupe (CC, CS ou CP) sur une bobine ou une chute source.
      </p>
      <div className="mt-6">
        <Suspense fallback={<p className="text-sm text-slate-500">Chargement…</p>}>
          <NewCutForm />
        </Suspense>
      </div>
    </div>
  );
}
