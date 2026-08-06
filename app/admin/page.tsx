import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { ADMIN_DEFAULT_ROUTE } from "@/lib/auth/admin-routes";

export default async function AdminIndexPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login?next=/admin");
  if (session.role === "master" || session.role === "manager") {
    redirect(ADMIN_DEFAULT_ROUTE[session.role]);
  }
  redirect("/dashboard");
}