import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { UsersAdmin } from "@/components/auth/UsersAdmin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "User management — Albelt Stocks",
};

export default async function AdminUsersPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login?next=/admin/users");
  if (session.role !== "master") redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-purple-700">
          User management
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Create, edit, and deactivate member accounts.
        </p>
      </div>
      <UsersAdmin currentUserId={session.id} />
    </div>
  );
}
