"use client";
import { useEffect, useState } from "react";
import { DEFAULT_CONTEXT, SCENARIOS, type SimulationContext } from "@/lib/ai/context";
import type { Recommendation } from "@/lib/client/useStorefront";
import type { Product } from "@/lib/types";
import { ContextControls, ScenarioChips } from "@/components/admin/ContextControls";
import { RankList } from "@/components/admin/RankList";
import { BrandPicker, ErrorNote, api, useAdminBrand } from "@/components/admin/shared";
import { useBrandMenu } from "@/components/admin/useBrandMenu";

function avgPrep(rec: Recommendation, products: Map<string, Product>, k = 4): string {
  const vals = rec.items
    .slice(0, k)
    .map((i) => products.get(i.productId)?.prepTimeSeconds)
    .filter((v): v is number => v != null);
  if (!vals.length) return "sin tiempos configurados";
  return `${Math.round(vals.reduce((a, b) => a + b, 0) / vals.length / 6) / 10} min (prep. demo)`;
}

export default function ComparatorPage() {
  const [brand, setBrand] = useAdminBrand();
  const { products } = useBrandMenu(brand);
  const [ctx, setCtx] = useState<SimulationContext>(DEFAULT_CONTEXT);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [manual, setManual] = useState<Recommendation | null>(null);
  const [ai, setAi] = useState<Recommendation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    const t = setTimeout(() => {
      Promise.all([
        api<Recommendation>("/api/recommendations", { body: { brand, context: ctx, mode: "baseline", persist: false } }),
        api<Recommendation>("/api/recommendations", { body: { brand, context: ctx, mode: "adaptive", persist: false } }),
      ])
        .then(([m, a]) => {
          if (cancel) return;
          setManual(m);
          setAi(a);
          setError(null);
        })
        .catch((e: Error) => !cancel && setError(e.message));
    }, 200);
    return () => {
      cancel = true;
      clearTimeout(t);
    };
  }, [brand, ctx]);

  const top = (r: Recommendation | null) => new Set(r?.items.slice(0, 4).map((i) => i.productId) ?? []);
  const changed = ai && manual ? [...top(ai)].filter((id) => !top(manual).has(id)).length : 0;

  return (
    <>
      <h1>Manual vs. IA</h1>
      <p className="ad-lede">
        El mismo escenario con dos ordenamientos: el menú fijo (orden del catálogo, sin IA) y el ranking LinUCB. Las flechas indican cuánto se movió
        cada producto respecto al menú fijo. Esta vista no registra eventos.
      </p>
      <div className="ad-toolbar">
        <BrandPicker brand={brand} onChange={setBrand} />
      </div>
      <section className="ad-panel">
        <ScenarioChips
          current={scenarioId}
          onPick={(id) => {
            setScenarioId(id);
            setCtx({ ...SCENARIOS.find((s) => s.id === id)!.context, cartProductIds: [] });
          }}
        />
        <div style={{ height: 12 }} />
        <ContextControls
          ctx={ctx}
          onChange={(c) => {
            setCtx(c);
            setScenarioId(null);
          }}
          queueLabel="en fila"
        />
      </section>
      <ErrorNote error={error} />
      {ai && manual && (
        <p className="ad-banner">
          La IA cambió {changed} de los 4 productos destacados. Tiempo de preparación promedio del top 4: manual {avgPrep(manual, products)}, IA{" "}
          {avgPrep(ai, products)}.
        </p>
      )}
      <div className="ad-grid2">
        <section className="ad-panel">
          <h2>Menú fijo (sin IA)</h2>
          {manual ? <RankList rec={manual} products={products} showReasons={false} /> : <p className="ad-empty">Calculando…</p>}
        </section>
        <section className="ad-panel">
          <h2>Ranking adaptativo (LinUCB)</h2>
          {ai ? <RankList rec={ai} compareTo={manual} products={products} /> : <p className="ad-empty">Calculando…</p>}
        </section>
      </div>
    </>
  );
}
