"use client";
import { SCENARIOS } from "@/lib/ai/context";
import type { Storefront } from "@/lib/client/useStorefront";

const WEATHER_TEXT = { soleado: "Soleado", nublado: "Nublado", lluvioso: "Lluvia" } as const;

/** Condiciones simuladas actuales + selector rápido de escenario. */
export function ContextBar({ sf }: { sf: Storefront }) {
  const c = sf.context;
  const current = SCENARIOS.find((s) => s.name === sf.scenarioName)?.id ?? "";
  return (
    <div className="mp-context" role="region" aria-label="Condiciones simuladas">
      <p className="mp-context-values">
        <span>{String(c.hour).padStart(2, "0")}:00</span>
        <span>{WEATHER_TEXT[c.weather]}</span>
        <span>{Math.round(c.temperatureC)} °C</span>
        <span>
          {c.queue} {sf.menu.brand.queueLabel}
        </span>
      </p>
      <label className="mp-context-select">
        <span>Escenario simulado</span>
        <select value={current} onChange={(e) => sf.setScenario(e.target.value)}>
          <option value="" disabled>
            {sf.scenarioName ?? "Condiciones por defecto"}
          </option>
          {SCENARIOS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
