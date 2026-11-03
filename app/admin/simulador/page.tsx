"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DEFAULT_CONTEXT, SCENARIOS, type SimulationContext } from "@/lib/ai/context";
import { storeContext, type Recommendation } from "@/lib/client/useStorefront";
import { ContextControls, ScenarioChips } from "@/components/admin/ContextControls";
import { RankList } from "@/components/admin/RankList";
import { BrandPicker, ErrorNote, api, useAdminBrand } from "@/components/admin/shared";
import { useBrandMenu } from "@/components/admin/useBrandMenu";

interface Applied {
  at: string;
  brand: string;
  scenario: string;
  context: SimulationContext;
  top: string[];
  latencyMs: number;
}

export default function SimulatorPage() {
  const [brand, setBrand] = useAdminBrand();
  const { menu, products, reload } = useBrandMenu(brand);
  const [ctx, setCtx] = useState<SimulationContext>(DEFAULT_CONTEXT);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [before, setBefore] = useState<Recommendation | null>(null);
  const [after, setAfter] = useState<Recommendation | null>(null);
  const [history, setHistory] = useState<Applied[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Al cambiar de marca, el "antes" es el ranking con el contexto actual.
  useEffect(() => {
    setAfter(null);
    setBefore(null);
    api<Recommendation>("/api/recommendations", { body: { brand, context: ctx, persist: false } })
      .then(setBefore)
      .catch((e: Error) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand]);

  function pickScenario(id: string) {
    const s = SCENARIOS.find((x) => x.id === id)!;
    setScenarioId(id);
    setCtx({ ...s.context, cartProductIds: ctx.cartProductIds });
  }

  async function apply() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const scenario = SCENARIOS.find((s) => s.id === scenarioId);
      // Escenario de inventario: marca como agotados los productos configurados.
      const soldOut = scenario?.soldOutSlugs?.[brand] ?? [];
      for (const slug of soldOut) {
        const p = menu?.products.find((x) => x.slug === slug);
        if (p && p.isAvailable) await api(`/api/products/${p.id}/availability`, { method: "PATCH", body: { isAvailable: false } });
      }
      if (soldOut.length) {
        reload();
        setNotice(`Se marcó como agotado: ${soldOut.map((s) => menu?.products.find((p) => p.slug === s)?.name ?? s).join(", ")}. Puedes reactivarlo en Catálogo e inventario.`);
      }
      const name = scenario?.name ?? "Escenario manual";
      const r = await api<Recommendation>("/api/recommendations", {
        body: { brand, context: ctx, persist: true, logImpressions: false, scenarioName: name },
      });
      setBefore(after ?? before);
      setAfter(r);
      setHistory((h) => [
        { at: new Date().toLocaleTimeString("es-MX"), brand: menu?.brand.name ?? brand, scenario: name, context: ctx, top: r.items.slice(0, 4).map((i) => products.get(i.productId)?.name ?? "?"), latencyMs: r.latencyMs },
        ...h,
      ].slice(0, 12));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const trained = after?.items.slice(0, 4).some((i) => i.source === "trained");
  const cartIds = new Set(ctx.cartProductIds);

  return (
    <>
      <h1>Simulador de contexto</h1>
      <p className="ad-lede">
        Cambia las condiciones simuladas y aplica el escenario para ver cómo se reordena el menú. Los productos agotados o fuera de horario nunca
        entran al ranking.
      </p>
      <div className="ad-toolbar">
        <BrandPicker brand={brand} onChange={setBrand} />
      </div>

      <section className="ad-panel" aria-labelledby="sim-ctx">
        <h2 id="sim-ctx">Condiciones</h2>
        <ScenarioChips current={scenarioId} onPick={pickScenario} />
        <div style={{ height: 12 }} />
        <ContextControls
          ctx={ctx}
          onChange={(c) => {
            setCtx(c);
            setScenarioId(null);
          }}
          queueLabel={menu?.brand.queueLabel ?? "en fila"}
        />
        <details style={{ marginTop: "1rem" }}>
          <summary>Carrito simulado ({ctx.cartProductIds.length})</summary>
          <p className="ad-muted">Los productos elegidos se usan como contexto para la venta complementaria.</p>
          <div className="ad-chips">
            {menu?.products.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={cartIds.has(p.id)}
                onClick={() =>
                  setCtx((c) => ({ ...c, cartProductIds: cartIds.has(p.id) ? c.cartProductIds.filter((x) => x !== p.id) : [...c.cartProductIds, p.id] }))
                }
              >
                {p.name}
              </button>
            ))}
          </div>
        </details>
        <div className="ad-toolbar" style={{ marginTop: "1rem", marginBottom: 0 }}>
          <button type="button" className="ad-primary" onClick={apply} disabled={busy}>
            {busy ? "Calculando…" : "Aplicar escenario"}
          </button>
          <button
            type="button"
            className="ad-secondary"
            onClick={() => {
              storeContext(ctx, SCENARIOS.find((s) => s.id === scenarioId)?.name ?? "Escenario manual");
              setNotice("Listo: los menús abiertos en este navegador ya usan estas condiciones.");
            }}
          >
            Usar estas condiciones en los menús
          </button>
          <Link href={`/menu/${brand}`} target="_blank" className="ad-secondary" style={{ textDecoration: "none" }}>
            Abrir menú completo
          </Link>
        </div>
        {notice && <p className="ad-banner" role="status" style={{ marginTop: ".75rem" }}>{notice}</p>}
        <ErrorNote error={error} />
      </section>

      <div className="ad-grid2">
        <section className="ad-panel" aria-labelledby="sim-before">
          <h2 id="sim-before">Antes</h2>
          {before ? <RankList rec={before} products={products} showReasons={false} /> : <p className="ad-empty">Calculando el ranking actual…</p>}
        </section>
        <section className="ad-panel" aria-labelledby="sim-after">
          <h2 id="sim-after">Después: recomendado para este momento</h2>
          {after ? (
            <>
              <p className="ad-muted" style={{ marginTop: 0 }}>
                {trained ? "Usa el modelo entrenado." : "Usa el modelo inicial (pocos datos todavía)."} Motor calculado en {after.latencyMs.toFixed(2)} ms.
                {after.ineligible.length > 0 && ` ${after.ineligible.length} productos no son elegibles (agotados o fuera de horario).`}
              </p>
              <RankList rec={after} compareTo={before} products={products} />
            </>
          ) : (
            <p className="ad-empty">Aplica un escenario para ver el nuevo orden y por qué cambió.</p>
          )}
        </section>
      </div>

      <section className="ad-panel" aria-labelledby="sim-hist">
        <h2 id="sim-hist">Escenarios aplicados en esta sesión</h2>
        {history.length === 0 ? (
          <p className="ad-empty">Aún no aplicas ningún escenario. El historial completo queda guardado en la sección Historial.</p>
        ) : (
          <div className="ad-scroll">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Marca</th>
                  <th>Escenario</th>
                  <th>Condiciones</th>
                  <th>Top 4</th>
                  <th className="num">Motor</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i}>
                    <td>{h.at}</td>
                    <td>{h.brand}</td>
                    <td>{h.scenario}</td>
                    <td>
                      {h.context.hour}:00, {h.context.weather}, {Math.round(h.context.temperatureC)} °C, fila {h.context.queue}, demanda {h.context.demand}
                    </td>
                    <td>{h.top.join(", ")}</td>
                    <td className="num">{h.latencyMs.toFixed(2)} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
