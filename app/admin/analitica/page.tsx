"use client";
import { useEffect, useState } from "react";
import { BarList, BrandPicker, ErrorNote, LineChart, SimTag, api, pct, useAdminBrand } from "@/components/admin/shared";

interface SourceMetrics {
  impressions: number;
  clicks: number;
  addToCart: number;
  purchases: number;
  ratingPositive: number;
  ratingNegative: number;
  ctr: number;
  addToCartRate: number;
  conversion: number;
  topProducts: { productId: string; name: string; purchases: number }[];
}
interface Analytics {
  storage: string;
  label: string;
  interactive: SourceMetrics & { orders: { orders: number; avgTotal: number; avgRating: number | null; rated: number } };
  synthetic: SourceMetrics;
  model: { trainingEvents: number; updatedAt: string | null; arms: number };
  trainingRuns: { createdAt: string; scenarioName: string | null; customers: number; result: { evaluation: { after: { avgReward: number; ctr: number; conversion: number }; baseline: { avgReward: number; ctr: number; conversion: number } } } }[];
}

type Source = "interactive" | "synthetic";

export default function AnalyticsPage() {
  const [brand, setBrand] = useAdminBrand();
  const [source, setSource] = useState<Source>("synthetic");
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    api<Analytics>(`/api/analytics/${brand}`)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [brand]);

  const m = data ? data[source] : null;
  return (
    <>
      <h1>
        Analítica de aprendizaje <SimTag />
      </h1>
      <p className="ad-lede">
        Métricas por marca y por origen de los eventos. “Interactivos” son las pruebas de personas en los menús; “sintéticos” son los clientes
        ficticios del entrenamiento. Ninguno representa ventas reales.
      </p>
      <div className="ad-toolbar">
        <BrandPicker brand={brand} onChange={setBrand} />
        <div className="ad-chips" role="group" aria-label="Origen de los eventos">
          <button type="button" aria-pressed={source === "synthetic"} onClick={() => setSource("synthetic")}>
            Entrenamiento sintético
          </button>
          <button type="button" aria-pressed={source === "interactive"} onClick={() => setSource("interactive")}>
            Demo interactiva
          </button>
        </div>
      </div>
      <ErrorNote error={error} />
      {!data || !m ? (
        <p className="ad-empty">Cargando…</p>
      ) : (
        <>
          <section className="ad-panel">
            <h2>{source === "synthetic" ? "Clientes simulados" : "Personas probando la demo"}</h2>
            {m.impressions === 0 ? (
              <p className="ad-empty">
                {source === "synthetic"
                  ? "Aún no hay entrenamiento para esta marca. Ve a Entrenamiento y simula algunos clientes."
                  : "Aún no hay interacciones. Abre el menú de esta marca, agrega productos y completa una orden simulada."}
              </p>
            ) : (
              <dl className="ad-kpis">
                <div>
                  <dt>Impresiones destacadas</dt>
                  <dd>{m.impressions}</dd>
                </div>
                <div>
                  <dt>CTR</dt>
                  <dd>{pct(m.ctr)}</dd>
                </div>
                <div>
                  <dt>Agregado al carrito</dt>
                  <dd>{pct(m.addToCartRate)}</dd>
                </div>
                <div>
                  <dt>Compra por impresión</dt>
                  <dd>{pct(m.conversion)}</dd>
                </div>
                <div>
                  <dt>Calificaciones + / −</dt>
                  <dd>
                    {m.ratingPositive} / {m.ratingNegative}
                  </dd>
                </div>
                {source === "interactive" && (
                  <>
                    <div>
                      <dt>Órdenes simuladas</dt>
                      <dd>{data.interactive.orders.orders}</dd>
                    </div>
                    <div>
                      <dt>Ticket promedio (demo)</dt>
                      <dd>${data.interactive.orders.avgTotal.toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt>Calificación promedio</dt>
                      <dd>{data.interactive.orders.avgRating == null ? "—" : data.interactive.orders.avgRating.toFixed(1)}</dd>
                    </div>
                  </>
                )}
              </dl>
            )}
          </section>
          <div className="ad-grid2">
            <section className="ad-panel">
              <BarList
                title="Productos más comprados"
                unit="compras"
                items={m.topProducts.map((p) => ({ label: p.name, value: p.purchases }))}
                empty="Todavía no hay compras registradas en este origen."
              />
            </section>
            <section className="ad-panel">
              <LineChart
                title="Evolución en evaluación por lote de entrenamiento"
                xLabel="Lotes (orden cronológico)"
                yLabel="Conversión de clientes"
                series={[
                  { name: "IA", values: data.trainingRuns.map((r) => r.result.evaluation.after.conversion), color: "#2f55d4" },
                  { name: "Menú fijo", values: data.trainingRuns.map((r) => r.result.evaluation.baseline.conversion), color: "#9aa4b2", dashed: true },
                ]}
              />
            </section>
          </div>
          <section className="ad-panel">
            <h2>Modelo</h2>
            <p style={{ margin: 0 }}>
              {data.model.trainingEvents} observaciones de entrenamiento, {data.model.arms} productos con datos.{" "}
              {data.model.updatedAt ? `Última actualización: ${new Date(data.model.updatedAt).toLocaleString("es-MX")}` : "Sin entrenar"}. Almacenamiento:{" "}
              {data.storage === "supabase" ? "Supabase (persistente)" : "memoria (se pierde al reiniciar)"}.
            </p>
          </section>
        </>
      )}
    </>
  );
}
