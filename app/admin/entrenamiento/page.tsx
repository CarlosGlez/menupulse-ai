"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { SCENARIOS } from "@/lib/ai/context";
import { BrandPicker, ErrorNote, LineChart, SimTag, api, pct, useAdminBrand } from "@/components/admin/shared";

interface Metrics {
  customers: number;
  impressions: number;
  ctr: number;
  addToCartRate: number;
  conversion: number;
  avgTicket: number;
  avgReward: number;
  weightedPrepSeconds: number | null;
  diversity: number;
}
interface TrainResult {
  customers: number;
  seed: number;
  curve: { adaptive: number[]; baseline: number[] };
  evaluation: { before: Metrics; after: Metrics; baseline: Metrics; evalCustomers: number };
  trainingEventsAfter: number;
  eventsRecorded: number;
}
interface Status {
  storage: string;
  trainingEvents: number;
  armsWithData: number;
  updatedAt: string | null;
  alpha: number;
  events: { interactive_demo: number; synthetic_batch: number };
  trainingRuns: { id: string; customers: number; seed: number; scenarioName: string | null; createdAt: string; result: Omit<TrainResult, "eventsRecorded"> }[];
}

const SIZES = [10, 25, 50, 100, 200];

export default function TrainingPage() {
  const [brand, setBrand] = useAdminBrand();
  const [status, setStatus] = useState<Status | null>(null);
  const [size, setSize] = useState(50);
  const [batches, setBatches] = useState(1);
  const [seed, setSeed] = useState(42);
  const [scenario, setScenario] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [last, setLast] = useState<TrainResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const cancelRef = useRef(false);

  const loadStatus = useCallback(() => {
    api<Status>(`/api/model/${brand}`)
      .then(setStatus)
      .catch((e: Error) => setError(e.message));
  }, [brand]);
  useEffect(() => {
    setLast(null);
    loadStatus();
  }, [loadStatus]);

  async function train() {
    setRunning(true);
    setError(null);
    cancelRef.current = false;
    let s = seed;
    try {
      for (let b = 1; b <= batches; b++) {
        if (cancelRef.current) {
          setProgress(`Cancelado después de ${b - 1} de ${batches} lotes. Lo ya entrenado se conserva.`);
          break;
        }
        setProgress(`Entrenando lote ${b} de ${batches} (${size} clientes simulados)…`);
        const r = await api<TrainResult>("/api/simulation/train", { body: { brand, customers: size, seed: s, scenarioId: scenario || null } });
        setLast(r);
        s += 1;
        setSeed(s);
        loadStatus();
        if (b === batches) setProgress(`Listo: ${batches} ${batches === 1 ? "lote" : "lotes"} entrenados.`);
      }
    } catch (e) {
      setError((e as Error).message);
      setProgress(null);
    } finally {
      setRunning(false);
    }
  }

  async function reset() {
    setConfirmReset(false);
    try {
      await api("/api/model/reset", { body: { brand, confirm: true } });
      setLast(null);
      setProgress("Modelo reiniciado: vuelve al estado inicial sin datos. El historial de eventos se conserva.");
      loadStatus();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const runs = [...(status?.trainingRuns ?? [])].reverse();
  const ev = last?.evaluation;
  const rows: { label: string; get: (m: Metrics) => string }[] = [
    { label: "Recompensa promedio", get: (m) => m.avgReward.toFixed(3) },
    { label: "CTR de destacados", get: (m) => pct(m.ctr) },
    { label: "Tasa de agregado al carrito", get: (m) => pct(m.addToCartRate) },
    { label: "Conversión (clientes que compran)", get: (m) => pct(m.conversion) },
    { label: "Ticket promedio", get: (m) => `$${m.avgTicket.toFixed(2)}` },
    { label: "Prep. promedio destacada", get: (m) => (m.weightedPrepSeconds == null ? "—" : `${Math.round(m.weightedPrepSeconds / 6) / 10} min`) },
    { label: "Diversidad de destacados", get: (m) => pct(m.diversity) },
  ];

  return (
    <>
      <h1>
        Entrenamiento con clientes simulados <SimTag />
      </h1>
      <p className="ad-lede">
        Cada cliente ficticio recibe un contexto realista, ve los 4 productos destacados y responde según una preferencia oculta (en{" "}
        <code>lib/ai/synthetic.ts</code>) que el modelo no conoce. El modelo solo aprende de las recompensas observadas. Después de cada lote se
        evalúa con los mismos 200 clientes de prueba (semilla fija) contra el menú fijo.
      </p>
      <div className="ad-toolbar">
        <BrandPicker brand={brand} onChange={setBrand} />
      </div>

      <section className="ad-panel">
        <h2>Estado del modelo</h2>
        {status ? (
          <dl className="ad-kpis">
            <div>
              <dt>Observaciones de entrenamiento</dt>
              <dd>{status.trainingEvents}</dd>
            </div>
            <div>
              <dt>Productos con datos</dt>
              <dd>{status.armsWithData}</dd>
            </div>
            <div>
              <dt>Eventos interactivos</dt>
              <dd>{status.events.interactive_demo}</dd>
            </div>
            <div>
              <dt>Eventos sintéticos</dt>
              <dd>{status.events.synthetic_batch}</dd>
            </div>
            <div>
              <dt>Exploración (alpha)</dt>
              <dd>{status.alpha}</dd>
            </div>
            <div>
              <dt>Última actualización</dt>
              <dd style={{ fontSize: ".95rem" }}>{status.updatedAt ? new Date(status.updatedAt).toLocaleString("es-MX") : "sin entrenar"}</dd>
            </div>
          </dl>
        ) : (
          <p className="ad-empty">Cargando…</p>
        )}
      </section>

      <section className="ad-panel">
        <h2>Nuevo entrenamiento</h2>
        <div className="ad-controls">
          <div className="ad-field">
            <span className="ad-label">Clientes por lote</span>
            <div className="ad-chips" role="group" aria-label="Clientes por lote">
              {SIZES.map((n) => (
                <button key={n} type="button" aria-pressed={size === n} onClick={() => setSize(n)}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="ad-field">
            <label htmlFor="t-batches">Lotes seguidos</label>
            <select id="t-batches" value={batches} onChange={(e) => setBatches(Number(e.target.value))}>
              {[1, 3, 5, 10].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="ad-field">
            <label htmlFor="t-seed">Semilla (reproducible)</label>
            <input id="t-seed" type="number" min={0} value={seed} onChange={(e) => setSeed(Math.max(0, Number(e.target.value) || 0))} />
          </div>
          <div className="ad-field">
            <label htmlFor="t-scn">Contextos</label>
            <select id="t-scn" value={scenario} onChange={(e) => setScenario(e.target.value)}>
              <option value="">Aleatorios (todo el día)</option>
              {SCENARIOS.map((s) => (
                <option key={s.id} value={s.id}>
                  Alrededor de: {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="ad-toolbar" style={{ marginTop: "1rem", marginBottom: 0 }}>
          <button type="button" className="ad-primary" onClick={train} disabled={running}>
            {running ? "Entrenando…" : `Simular ${size * batches} clientes`}
          </button>
          {running && (
            <button type="button" className="ad-secondary" onClick={() => (cancelRef.current = true)}>
              Cancelar después de este lote
            </button>
          )}
          {!confirmReset ? (
            <button type="button" className="ad-danger" onClick={() => setConfirmReset(true)} disabled={running}>
              Reiniciar modelo
            </button>
          ) : (
            <span role="alert">
              ¿Borrar lo aprendido por este modelo?{" "}
              <button type="button" className="ad-danger" onClick={reset}>
                Sí, reiniciar
              </button>{" "}
              <button type="button" className="ad-secondary" onClick={() => setConfirmReset(false)}>
                No
              </button>
            </span>
          )}
        </div>
        {progress && (
          <p className="ad-banner" role="status" style={{ marginTop: ".75rem" }}>
            {progress}
          </p>
        )}
        <ErrorNote error={error} />
      </section>

      {ev && last && (
        <section className="ad-panel">
          <h2>
            Resultado del último lote <SimTag />
          </h2>
          <p className="ad-muted" style={{ marginTop: 0 }}>
            {last.customers} clientes, semilla {last.seed}, {last.eventsRecorded} eventos registrados. Evaluación con {ev.evalCustomers} clientes de
            prueba iguales para las tres columnas.{" "}
            {ev.after.avgReward > ev.before.avgReward
              ? "La recompensa de evaluación subió con este lote."
              : "En este lote la recompensa de evaluación no subió; con pocos datos es normal que oscile."}
          </p>
          <div className="ad-scroll">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Métrica (simulada)</th>
                  <th className="num">Menú fijo</th>
                  <th className="num">IA antes del lote</th>
                  <th className="num">IA después del lote</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label}>
                    <td>{r.label}</td>
                    <td className="num">{r.get(ev.baseline)}</td>
                    <td className="num">{r.get(ev.before)}</td>
                    <td className="num">
                      <strong>{r.get(ev.after)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="ad-grid2">
        <section className="ad-panel">
          <LineChart
            title="Aprendizaje acumulado: recompensa en evaluación después de cada lote"
            xLabel="Lotes de entrenamiento (orden cronológico)"
            yLabel="Recompensa promedio"
            series={[
              { name: "IA (LinUCB)", values: runs.map((r) => r.result.evaluation.after.avgReward), color: "#2f55d4" },
              { name: "Menú fijo", values: runs.map((r) => r.result.evaluation.baseline.avgReward), color: "#9aa4b2", dashed: true },
            ]}
          />
        </section>
        <section className="ad-panel">
          <LineChart
            title="Dentro del último lote: recompensa por ronda de 10 clientes"
            xLabel="Rondas"
            yLabel="Recompensa promedio"
            series={
              last
                ? [
                    { name: "IA aprendiendo", values: last.curve.adaptive, color: "#2f55d4" },
                    { name: "Menú fijo", values: last.curve.baseline, color: "#9aa4b2", dashed: true },
                  ]
                : []
            }
          />
        </section>
      </div>
    </>
  );
}
