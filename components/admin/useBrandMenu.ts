"use client";
import { useCallback, useEffect, useState } from "react";
import type { BrandSlug, MenuData, Product } from "@/lib/types";
import { api } from "./shared";

export function useBrandMenu(brand: BrandSlug) {
  const [menu, setMenu] = useState<MenuData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    api<MenuData>(`/api/menu/${brand}`)
      .then((m) => {
        setMenu(m);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, [brand]);
  useEffect(() => {
    setMenu(null);
    reload();
  }, [reload]);
  const products = new Map<string, Product>((menu?.products ?? []).map((p) => [p.id, p]));
  return { menu, products, error, reload };
}
