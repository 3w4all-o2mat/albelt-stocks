import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = {
  title: "Sign in — Albelt Stocks",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-64px)] items-start justify-center pt-8 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-purple-700">
            Albelt Stocks
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to access the workshop dashboard.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
