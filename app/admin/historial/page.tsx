"use client";
import { useEffect, useState } from "react";
import { BrandPicker, ErrorNote, api, useAdminBrand } from "@/components/admin/shared";

interface Run {
  id: string;
  createdAt: string;
  mode: "adaptive" | "baseline";
  context: { hour: number; weather: string; temperatureC: number; queue: number; demand: number; day: string };
  closed: boolean;
  top: { name: string; score: number; source: string; reasons: string[] }[];
}

export default function HistoryPage() {
  const [brand, setBrand] = useAdminBrand();
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setRuns(null);
    api<Run[]>(`/api/history/${brand}`)
      .then(setRuns)
      .catch((e: Error) => setError(e.message));
  }, [brand]);

  return (
    <>
      <h1>Historial de recomendaciones</h1>
      <p className="mpa-lede">
        Las últimas 30 ejecuciones del motor: visitas a los menús y escenarios aplicados en el simulador, con el contexto, el top 4 y los factores
        que explicaron cada posición. “Aprendida” indica que la observación ya se cerró y actualizó el modelo.
      </p>
      <div className="mpa-toolbar">
        <BrandPicker brand={brand} onChange={setBrand} />
      </div>
      <ErrorNote error={error} />
      {!runs ? (
        <p className="mpa-empty">Cargando…</p>
      ) : runs.length === 0 ? (
        <p className="mpa-empty">Todavía no hay ejecuciones. Abre el menú de esta marca o aplica un escenario en el simulador.</p>
      ) : (
        runs.map((r) => (
          <details key={r.id} className="mpa-panel">
            <summary>
              <strong>{new Date(r.createdAt).toLocaleString("es-MX")}</strong> · {r.context.hour}:00, {r.context.day}, {r.context.weather},{" "}
              {Math.round(r.context.temperatureC)} °C, fila {r.context.queue}, demanda {Math.round(r.context.demand)} ·{" "}
              {r.mode === "adaptive" ? "IA" : "menú fijo"} · {r.closed ? "aprendida" : "abierta"}
            </summary>
            <ol className="mpa-rank" style={{ marginTop: ".5rem" }}>
              {r.top.map((t, i) => (
                <li key={i}>
                  <span className="pos">{i + 1}</span>
                  <span>
                    <span className="name">{t.name}</span> <span className="mpa-src">puntaje {t.score} · {t.source === "trained" ? "entrenado" : t.source === "initial" ? "inicial" : "fijo"}</span>
                  </span>
                  <span />
                  <ul className="reasons">
                    {t.reasons.map((x, k) => (
                      <li key={k}>{x}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </details>
        ))
      )}
    </>
  );
}
