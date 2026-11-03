"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BRAND_OPTIONS, ErrorNote, SimTag, api, pct } from "@/components/admin/shared";

interface Summary {
  model: { trainingEvents: number; updatedAt: string | null; arms: number };
  interactive: { impressions: number; ctr: number; orders: { orders: number } };
  synthetic: { impressions: number };
  trainingRuns: { result: { evaluation: { after: { avgReward: number }; baseline: { avgReward: number } } } }[];
}

export default function AdminHome() {
  const [data, setData] = useState<Record<string, Summary>>({});
  const [failed, setFailed] = useState<Record<string, true>>({});
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    // Cada marca carga por separado: si una falla, las demás se muestran igual.
    for (const b of BRAND_OPTIONS) {
      api<Summary>(`/api/analytics/${b.slug}`)
        .then((s) => setData((d) => ({ ...d, [b.slug]: s })))
        .catch((e: Error) => {
          setError(e.message);
          setFailed((f) => ({ ...f, [b.slug]: true }));
        });
    }
  }, []);

  return (
    <>
      <h1>Resumen</h1>
      <p className="ad-lede">
        Estado de las tres marcas. Para la demostración: aplica un escenario en el <Link href="/admin/simulador">Simulador</Link>, compáralo en{" "}
        <Link href="/admin/comparador">Manual vs. IA</Link>, entrena con clientes simulados en <Link href="/admin/entrenamiento">Entrenamiento</Link> y
        vuelve a aplicar el escenario para ver el cambio.
      </p>
      <ErrorNote error={error} />
      <div className="ad-grid3">
        {BRAND_OPTIONS.map((b) => {
          const s = data[b.slug];
          const lastRun = s?.trainingRuns.at(-1)?.result.evaluation;
          return (
            <section key={b.slug} className="ad-panel">
              <h2>{b.name}</h2>
              {!s ? (
                <p className="ad-empty">{failed[b.slug] ? "No se pudieron cargar los datos (ver el aviso de arriba)." : "Cargando…"}</p>
              ) : (
                <dl className="ad-kpis">
                  <div>
                    <dt>Observaciones del modelo</dt>
                    <dd>{s.model.trainingEvents}</dd>
                  </div>
                  <div>
                    <dt>Órdenes demo</dt>
                    <dd>{s.interactive.orders.orders}</dd>
                  </div>
                  <div>
                    <dt>CTR interactivo</dt>
                    <dd>{s.interactive.impressions ? pct(s.interactive.ctr) : "—"}</dd>
                  </div>
                  <div>
                    <dt>
                      Recompensa IA vs. fijo <SimTag />
                    </dt>
                    <dd style={{ fontSize: "1rem" }}>
                      {lastRun ? `${lastRun.after.avgReward.toFixed(3)} vs ${lastRun.baseline.avgReward.toFixed(3)}` : "sin entrenar"}
                    </dd>
                  </div>
                </dl>
              )}
              <p style={{ marginBottom: 0 }}>
                <Link href={`/menu/${b.slug}`}>Abrir menú</Link>
                {s?.model.updatedAt && <span className="ad-muted"> · modelo actualizado {new Date(s.model.updatedAt).toLocaleString("es-MX")}</span>}
              </p>
            </section>
          );
        })}
      </div>
    </>
  );
}
