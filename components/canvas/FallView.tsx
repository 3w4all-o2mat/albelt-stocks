"use client";

import { useQuery } from "@tanstack/react-query";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import type { Ancestor } from "@/lib/types";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch " + url);
  return res.json() as Promise<T>;
}

export function FallBreadcrumb({ id }: { id: number }) {
  const { data: ancestors } = useQuery<Ancestor[]>({
    queryKey: ["ancestors", id],
    queryFn: () => fetchJson<Ancestor[]>(`/api/stocks/${id}/ancestors`),
  });
  if (!ancestors) return null;
  return <Breadcrumb ancestors={ancestors} />;
}
