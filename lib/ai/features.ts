// Vector de características (contexto × producto). Dimensión FIJA y versionada.
// Si cambias el orden o la dimensión, sube FEATURE_VERSION: los modelos guardados
// con otra versión se reinicializan automáticamente (ver linucb.ts).
import type { Product } from "../types";
import { daypartOf, effectiveRain, isWeekend, type SimulationContext } from "./context";

export const FEATURE_VERSION = 1;

/** Umbral DEMO para considerar un producto "de preparación rápida" (solo si tiene tiempo configurado). */
export const QUICK_PREP_SECONDS = 180;

// Diseño: LinUCB DISJUNTO (un modelo por producto). Por eso el vector describe sobre todo
// el CONTEXTO: cada producto aprende su propia respuesta a la temperatura, la lluvia, la hora, etc.
// Indicadores fijos del producto (frío, caliente, postre…) serían constantes dentro de su propio
// modelo y quedarían absorbidos por el sesgo; además sesgarían la exploración inicial.
// La única característica producto×contexto es la compatibilidad con el carrito.
export const FEATURES = [
  { key: "bias", label: "Ha tenido buena respuesta en general en el historial" },
  { key: "temp", label: "Temperatura (centrada en 25 °C)" },
  { key: "rain", label: "Con lluvia ha tenido mejor respuesta" },
  { key: "morning", label: "En la mañana ha tenido mejor respuesta" },
  { key: "evening", label: "En la noche ha tenido mejor respuesta" },
  { key: "weekend", label: "En fin de semana ha tenido mejor respuesta" },
  { key: "weekend_evening", label: "En noches de fin de semana ha tenido mejor respuesta" },
  { key: "queue", label: "Fila (centrada en 10)" },
  { key: "demand", label: "Demanda (centrada en 50)" },
  { key: "cart_complement", label: "Complementa lo que ya está en el carrito" },
] as const;

export type FeatureKey = (typeof FEATURES)[number]["key"];
export const FEATURE_DIM = FEATURES.length;

export interface FeatureEnv {
  /** slug de categoría por id de categoría */
  categorySlugById: Map<string, string>;
  /** productos actualmente en el carrito */
  cartProducts: Product[];
}

export function isQuick(p: Product): boolean {
  return p.prepTimeSeconds !== null && p.prepTimeSeconds <= QUICK_PREP_SECONDS;
}

export function complementsCart(p: Product, env: FeatureEnv): boolean {
  const slug = env.categorySlugById.get(p.categoryId);
  if (!slug) return false;
  return env.cartProducts.some((c) => c.id !== p.id && c.complementCategorySlugs.includes(slug));
}

export function buildFeatures(p: Product, ctx: SimulationContext, env: FeatureEnv): number[] {
  const dp = daypartOf(ctx.hour);
  const weekend = isWeekend(ctx.day) ? 1 : 0;
  const x = [
    1,
    (ctx.temperatureC - 25) / 15, // -1..1 (centrado: el signo indica calor/fresco)
    effectiveRain(ctx),
    dp === "morning" ? 1 : 0,
    dp === "evening" ? 1 : 0,
    weekend,
    weekend * (dp === "evening" ? 1 : 0),
    ctx.queue / 10 - 1, // -1..1
    ctx.demand / 50 - 1, // -1..1
    complementsCart(p, env) ? 1 : 0,
  ];
  if (x.length !== FEATURE_DIM) throw new Error("Dimensión de características inconsistente");
  return x;
}
