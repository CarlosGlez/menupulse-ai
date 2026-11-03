"use client";
import { useCallback, useEffect, useState } from "react";
import type { BrandSlug } from "@/lib/types";

export const BRAND_OPTIONS: { slug: BrandSlug; name: string }[] = [
  { slug: "dominos", name: "Domino's Pizza" },
  { slug: "carls-jr", name: "Carl's Jr." },
  { slug: "degas-cafe", name: "Degas Café" },
];

const BRAND_KEY = "menupulse:admin-brand";

/** Marca seleccionada en el panel (recordada por navegador como comodidad). */
export function useAdminBrand(): [BrandSlug, (b: BrandSlug) => void] {
  const [brand, setBrand] = useState<BrandSlug>("degas-cafe");
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(BRAND_KEY) as BrandSlug | null;
      if (v && BRAND_OPTIONS.some((b) => b.slug === v)) setBrand(v);
    } catch {
      /* sin almacenamiento */
    }
  }, []);
  const set = useCallback((b: BrandSlug) => {
    setBrand(b);
    try {
      window.localStorage.setItem(BRAND_KEY, b);
    } catch {
      /* sin almacenamiento */
    }
  }, []);
  return [brand, set];
}

export async function api<T>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? (init?.body ? "POST" : "GET"),
    headers: init?.body ? { "content-type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    window.location.reload(); // la sesión expiró: vuelve a pedir el código
  }
  if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
  return data as T;
}

export function BrandPicker({ brand, onChange }: { brand: BrandSlug; onChange: (b: BrandSlug) => void }) {
  return (
    <div className="mpa-brand" role="radiogroup" aria-label="Marca">
      {BRAND_OPTIONS.map((b) => (
        <button key={b.slug} type="button" role="radio" aria-checked={brand === b.slug} onClick={() => onChange(b.slug)}>
          {b.name}
        </button>
      ))}
    </div>
  );
}

export function SimTag() {
  return <span className="mpa-simtag">Datos simulados</span>;
}

export function pct(n: number) {
  return `${(n * 100).toFixed(1)} %`;
}

export function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="mpa-error" role="alert">
      {error}
    </p>
  );
}

/** Gráfica de líneas SVG simple con ejes, leyenda y estado vacío. */
export function LineChart({
  title,
  series,
  yLabel,
  xLabel,
}: {
  title: string;
  series: { name: string; values: number[]; color: string; dashed?: boolean }[];
  yLabel: string;
  xLabel: string;
}) {
  const all = series.flatMap((s) => s.values);
  const W = 640;
  const H = 260;
  const P = { l: 52, r: 16, t: 16, b: 40 };
  if (all.length === 0) {
    return (
      <figure className="mpa-chart">
        <figcaption>{title}</figcaption>
        <p className="mpa-empty">Todavía no hay datos. Ejecuta un entrenamiento para ver la curva.</p>
      </figure>
    );
  }
  const n = Math.max(...series.map((s) => s.values.length));
  const min = Math.min(0, ...all);
  const max = Math.max(...all, 0.05);
  const x = (i: number) => P.l + (n <= 1 ? 0 : (i / (n - 1)) * (W - P.l - P.r));
  const y = (v: number) => P.t + (1 - (v - min) / (max - min || 1)) * (H - P.t - P.b);
  const ticks = [min, (min + max) / 2, max];
  return (
    <figure className="mpa-chart">
      <figcaption>{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="var(--mpa-line)" />
            <text x={P.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--mpa-muted)">
              {t.toFixed(2)}
            </text>
          </g>
        ))}
        {series.map((s) => (
          <polyline
            key={s.name}
            fill="none"
            stroke={s.color}
            strokeWidth="2.5"
            strokeDasharray={s.dashed ? "6 5" : undefined}
            points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
          />
        ))}
        <text x={(P.l + W - P.r) / 2} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--mpa-muted)">
          {xLabel}
        </text>
        <text x={14} y={H / 2} textAnchor="middle" fontSize="12" fill="var(--mpa-muted)" transform={`rotate(-90 14 ${H / 2})`}>
          {yLabel}
        </text>
      </svg>
      <ul className="mpa-legend">
        {series.map((s) => (
          <li key={s.name}>
            <span style={{ background: s.color }} aria-hidden="true" />
            {s.name}
          </li>
        ))}
      </ul>
    </figure>
  );
}

export function BarList({ title, items, unit, empty }: { title: string; items: { label: string; value: number }[]; unit: string; empty: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <figure className="mpa-chart">
      <figcaption>{title}</figcaption>
      {items.length === 0 ? (
        <p className="mpa-empty">{empty}</p>
      ) : (
        <ul className="mpa-bars">
          {items.map((i) => (
            <li key={i.label}>
              <span className="mpa-bar-label">{i.label}</span>
              <span className="mpa-bar-track">
                <span className="mpa-bar-fill" style={{ width: `${(i.value / max) * 100}%` }} />
              </span>
              <span className="mpa-bar-value">
                {i.value} {unit}
              </span>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}
