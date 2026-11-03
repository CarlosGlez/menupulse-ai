// Contexto simulado que controla el panel. Todas las variables son de simulación.
import { z } from "zod";
import type { Daypart } from "../types";

export const WEATHER = ["soleado", "nublado", "lluvioso"] as const;
export const DAYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"] as const;

export const SimulationContextSchema = z.object({
  hour: z.number().int().min(6).max(23),
  day: z.enum(DAYS),
  weather: z.enum(WEATHER),
  temperatureC: z.number().min(10).max(40),
  rainIntensity: z.number().min(0).max(100),
  queue: z.number().int().min(0).max(20),
  demand: z.number().min(0).max(100),
  /** IDs de productos actualmente en el carrito (para venta complementaria). */
  cartProductIds: z.array(z.string().uuid()).max(50).default([]),
});

export type SimulationContext = z.infer<typeof SimulationContextSchema>;

export const DEFAULT_CONTEXT: SimulationContext = {
  hour: 13,
  day: "miercoles",
  weather: "soleado",
  temperatureC: 26,
  rainIntensity: 0,
  queue: 3,
  demand: 40,
  cartProductIds: [],
};

export function daypartOf(hour: number): Daypart {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export function isWeekend(day: SimulationContext["day"]): boolean {
  return day === "sabado" || day === "domingo";
}

/** Lluvia efectiva 0..1 (solo cuenta si el clima es lluvioso). */
export function effectiveRain(ctx: SimulationContext): number {
  return ctx.weather === "lluvioso" ? Math.max(ctx.rainIntensity, 20) / 100 : 0;
}

/** Presión operativa 0..1 a partir de fila y demanda. */
export function operationalPressure(ctx: SimulationContext): number {
  return Math.min(1, 0.6 * (ctx.queue / 20) + 0.4 * (ctx.demand / 100));
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  context: Omit<SimulationContext, "cartProductIds">;
  /** Slugs de producto que el escenario marca como agotados (escenario de inventario). */
  soldOutSlugs?: Partial<Record<string, string[]>>;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "dia-caluroso",
    name: "Día caluroso",
    description: "34 °C, soleado, 13:00, fila baja.",
    context: { hour: 13, day: "sabado", weather: "soleado", temperatureC: 34, rainIntensity: 0, queue: 2, demand: 35 },
  },
  {
    id: "lluvia-tarde",
    name: "Lluvia y tarde fresca",
    description: "20 °C, lluvia alta, 18:00, fila media.",
    context: { hour: 18, day: "jueves", weather: "lluvioso", temperatureC: 20, rainIntensity: 80, queue: 8, demand: 50 },
  },
  {
    id: "hora-pico",
    name: "Hora pico",
    description: "20:00, fila y demanda altas.",
    context: { hour: 20, day: "viernes", weather: "nublado", temperatureC: 25, rainIntensity: 0, queue: 17, demand: 90 },
  },
  {
    id: "manana-tranquila",
    name: "Mañana tranquila",
    description: "08:00, fila baja.",
    context: { hour: 8, day: "martes", weather: "nublado", temperatureC: 22, rainIntensity: 0, queue: 1, demand: 15 },
  },
  {
    id: "inventario-limitado",
    name: "Inventario limitado",
    description: "Un producto destacado se agota y deja de ser elegible.",
    context: { hour: 14, day: "miercoles", weather: "soleado", temperatureC: 30, rainIntensity: 0, queue: 5, demand: 50 },
    soldOutSlugs: { "degas-cafe": ["frappe-cookies"], dominos: ["extravaganzza"], "carls-jr": ["famous-star"] },
  },
];
