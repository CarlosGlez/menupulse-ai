// GENERADOR DE CLIENTES SIMULADOS. Está separado a propósito del modelo LinUCB:
// aquí vive la "preferencia oculta" del mundo simulado; el modelo no la conoce y
// solo aprende de las recompensas que observa. Todo lo que sale de aquí es DATO SIMULADO.
import type { InteractionEventType, Product } from "../types";
import {
  DAYS,
  daypartOf,
  effectiveRain,
  isWeekend,
  operationalPressure,
  type Scenario,
  type SimulationContext,
} from "./context";
import { isQuick } from "./features";

/** PRNG reproducible (mulberry32). */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
const pick = <T,>(rng: () => number, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

/** Contexto aleatorio realista; si hay escenario, se usa como base con ruido pequeño. */
export function randomContext(rng: () => number, scenario?: Scenario): Omit<SimulationContext, "cartProductIds"> {
  if (scenario) {
    const c = scenario.context;
    return {
      ...c,
      hour: Math.min(23, Math.max(6, c.hour + Math.round((rng() - 0.5) * 2))),
      temperatureC: Math.min(40, Math.max(10, c.temperatureC + (rng() - 0.5) * 4)),
      queue: Math.min(20, Math.max(0, c.queue + Math.round((rng() - 0.5) * 4))),
      demand: Math.min(100, Math.max(0, c.demand + (rng() - 0.5) * 20)),
    };
  }
  const weather = rng() < 0.55 ? "soleado" : rng() < 0.6 ? "nublado" : "lluvioso";
  const hour = 6 + Math.floor(rng() * 18);
  const peak = (hour >= 13 && hour <= 15) || (hour >= 19 && hour <= 21);
  return {
    hour,
    day: pick(rng, DAYS),
    weather,
    temperatureC: Math.round(10 + rng() * 30),
    rainIntensity: weather === "lluvioso" ? Math.round(30 + rng() * 70) : 0,
    queue: Math.round((peak ? 8 : 0) + rng() * 12),
    demand: Math.round((peak ? 50 : 10) + rng() * 50),
  };
}

/**
 * Popularidad oculta por producto en [-0.6, 0.6], determinista a partir del slug.
 * Representa que en el mundo simulado algunos productos simplemente gustan más;
 * el modelo NO la conoce y debe descubrirla con las recompensas.
 */
export function hiddenPopularity(slug: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < slug.length; i++) h = Math.imul(h ^ slug.charCodeAt(i), 0x01000193) >>> 0;
  return ((h % 1000) / 1000 - 0.5) * 1.2;
}

/** Utilidad oculta del cliente simulado para un producto en un contexto. */
export function hiddenUtility(p: Product, ctx: SimulationContext, cart: Product[], complements: boolean): number {
  const has = (t: Product["tags"][number]) => p.tags.includes(t);
  let u = -1.6 + hiddenPopularity(p.slug);
  if (ctx.temperatureC >= 28) {
    if (has("cold_drink")) u += 1.4;
    if (has("hot_drink")) u -= 0.9;
  }
  if (ctx.temperatureC <= 22 && has("hot_drink")) u += 0.9;
  const rain = effectiveRain(ctx);
  if (rain > 0 && (has("comfort") || has("hot_drink"))) u += 1.0 * rain;
  const dp = daypartOf(ctx.hour);
  if (dp === "morning" && has("breakfast")) u += 1.1;
  if (operationalPressure(ctx) > 0.6) {
    if (isQuick(p)) u += 0.6;
    if (has("combo")) u += 0.5;
  }
  if (dp === "evening" && isWeekend(ctx.day) && (has("shareable") || has("family"))) u += 0.6;
  if (complements) u += 0.7;
  if (has("dessert") && cart.some((c) => c.tags.includes("savory"))) u += 0.3;
  return u;
}

export interface SimulatedResponse {
  events: InteractionEventType[];
  purchased: boolean;
}

/** Respuesta del cliente ante un producto mostrado en la posición `position` (1 = más destacado). */
export function simulateResponse(rng: () => number, utility: number, position: number): SimulatedResponse {
  const events: InteractionEventType[] = ["impression"];
  const clicked = rng() < sigmoid(utility - 0.3 * (position - 1));
  if (!clicked) return { events, purchased: false };
  events.push("click");
  if (rng() < 0.6) {
    events.push("add_to_cart");
    if (rng() < 0.1) {
      events.push("remove_from_cart");
      return { events, purchased: false };
    }
    if (rng() < 0.85) {
      events.push("purchase");
      const r = rng();
      if (utility > 0 && r < 0.6) events.push("rating_positive");
      else if (utility <= 0 && r < 0.3) events.push("rating_negative");
      return { events, purchased: true };
    }
  }
  return { events, purchased: false };
}
