"use client";
import { DAYS, SCENARIOS, WEATHER, type SimulationContext } from "@/lib/ai/context";

const DAY_TEXT: Record<(typeof DAYS)[number], string> = {
  lunes: "Lunes",
  martes: "Martes",
  miercoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
  sabado: "Sábado",
  domingo: "Domingo",
};
const WEATHER_TEXT: Record<(typeof WEATHER)[number], string> = { soleado: "Soleado", nublado: "Nublado", lluvioso: "Lluvioso" };

export function ScenarioChips({ current, onPick }: { current: string | null; onPick: (id: string) => void }) {
  return (
    <div className="ad-chips" role="group" aria-label="Escenarios precargados">
      {SCENARIOS.map((s) => (
        <button key={s.id} type="button" aria-pressed={current === s.id} onClick={() => onPick(s.id)} title={s.description}>
          {s.name}
        </button>
      ))}
    </div>
  );
}

/** Controles manuales de todas las variables simuladas. */
export function ContextControls({
  ctx,
  onChange,
  queueLabel,
}: {
  ctx: SimulationContext;
  onChange: (c: SimulationContext) => void;
  queueLabel: string;
}) {
  const set = <K extends keyof SimulationContext>(k: K, v: SimulationContext[K]) => onChange({ ...ctx, [k]: v });
  return (
    <div className="ad-controls">
      <div className="ad-field">
        <label htmlFor="c-hour">
          Hora <output>{String(ctx.hour).padStart(2, "0")}:00</output>
        </label>
        <input id="c-hour" type="range" min={6} max={23} value={ctx.hour} onChange={(e) => set("hour", Number(e.target.value))} />
      </div>
      <div className="ad-field">
        <label htmlFor="c-day">Día</label>
        <select id="c-day" value={ctx.day} onChange={(e) => set("day", e.target.value as SimulationContext["day"])}>
          {DAYS.map((d) => (
            <option key={d} value={d}>
              {DAY_TEXT[d]}
            </option>
          ))}
        </select>
      </div>
      <div className="ad-field">
        <label htmlFor="c-weather">Clima</label>
        <select id="c-weather" value={ctx.weather} onChange={(e) => set("weather", e.target.value as SimulationContext["weather"])}>
          {WEATHER.map((w) => (
            <option key={w} value={w}>
              {WEATHER_TEXT[w]}
            </option>
          ))}
        </select>
      </div>
      <div className="ad-field">
        <label htmlFor="c-temp">
          Temperatura <output>{Math.round(ctx.temperatureC)} °C</output>
        </label>
        <input id="c-temp" type="range" min={10} max={40} value={ctx.temperatureC} onChange={(e) => set("temperatureC", Number(e.target.value))} />
      </div>
      <div className="ad-field">
        <label htmlFor="c-rain">
          Intensidad de lluvia <output>{ctx.weather === "lluvioso" ? `${ctx.rainIntensity} %` : "solo con lluvia"}</output>
        </label>
        <input
          id="c-rain"
          type="range"
          min={0}
          max={100}
          value={ctx.rainIntensity}
          disabled={ctx.weather !== "lluvioso"}
          onChange={(e) => set("rainIntensity", Number(e.target.value))}
        />
      </div>
      <div className="ad-field">
        <label htmlFor="c-queue">
          Fila <output>{ctx.queue} {queueLabel}</output>
        </label>
        <input id="c-queue" type="range" min={0} max={20} value={ctx.queue} onChange={(e) => set("queue", Number(e.target.value))} />
      </div>
      <div className="ad-field">
        <label htmlFor="c-demand">
          Demanda <output>{ctx.demand} / 100</output>
        </label>
        <input id="c-demand" type="range" min={0} max={100} value={ctx.demand} onChange={(e) => set("demand", Number(e.target.value))} />
      </div>
    </div>
  );
}
