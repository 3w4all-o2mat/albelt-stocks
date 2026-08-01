import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { findUserById } from "@/lib/queries/membership";
import { ProfileForm } from "@/components/auth/ProfileForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My profile — Albelt Stocks",
};

export default async function ProfilePage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login?next=/profile");

  const user = await findUserById(session.id);
  if (!user) redirect("/login?next=/profile");

  return (
    <div className="mx-auto max-w-4xl px-4 py-2">
      <h1 className="text-2xl font-semibold tracking-tight text-purple-700">
        My profile
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Manage your account details and password.
      </p>
      <div className="mt-6">
        <ProfileForm user={user} />
      </div>
    </div>
  );
}
