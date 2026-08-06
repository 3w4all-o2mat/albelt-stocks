import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { AdminSidebar } from "@/components/ui/AdminSidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentUser();
  if (!session) redirect("/login?next=/admin");
  if (session.role !== "master" && session.role !== "manager") {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-1 px-4 py-2">
      <AdminSidebar role={session.role} />
      <div className="min-w-0 flex-1 pl-6">{children}</div>
    </div>
  );
}