import { JournalAdmin } from "@/components/auth/JournalAdmin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Journal — Albelt Stocks",
};

export default function AdminJournalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Journal
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Audit log of stock operations. Newest first.
        </p>
      </div>
      <JournalAdmin />
    </div>
  );
}