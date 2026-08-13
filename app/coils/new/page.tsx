import { requirePageAuth } from "@/lib/auth/guard";
import { NewCoilForm } from "@/components/forms/NewCoilForm";
import { findUserById } from "@/lib/queries/membership";
import { findAtelierById } from "@/lib/queries/ateliers";

export const dynamic = "force-dynamic";

export default async function NewCoilPage({
  searchParams,
}: {
  searchParams?: { atelier?: string };
}) {
  const sessionUser = await requirePageAuth();
  const user = await findUserById(sessionUser.id);
  const userAtelier = user?.atelier_id ? await findAtelierById(user.atelier_id) : null;
  const defaultAtelier = searchParams?.atelier?.trim() || userAtelier?.name || "";
  return (
    <div className="mx-auto max-w-3xl px-4 py-2">
      <h1 className="text-2xl font-bold tracking-tight text-purple-700">Nouvelle bobine</h1>
      <p className="mt-1 text-sm text-slate-500">
        Enregistrez une nouvelle bobine source (BO) dans le stock.
      </p>
      <div className="mt-6">
        <NewCoilForm defaultAtelier={defaultAtelier} />
      </div>
    </div>
  );
}
