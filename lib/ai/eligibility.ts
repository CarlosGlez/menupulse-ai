// Restricciones duras: un producto no elegible NUNCA entra al ranking.
import type { Product } from "../types";
import { daypartOf, type SimulationContext } from "./context";

export type IneligibleReason = "inactivo" | "agotado" | "sin_stock" | "fuera_de_horario" | "sin_precio";

export function ineligibleReason(p: Product, ctx: SimulationContext): IneligibleReason | null {
  if (!p.isActive) return "inactivo";
  if (!p.isAvailable) return "agotado";
  if (p.stockDemo !== null && p.stockDemo <= 0) return "sin_stock";
  if (!p.dayparts.includes(daypartOf(ctx.hour))) return "fuera_de_horario";
  if (p.price === null) return "sin_precio";
  return null;
}

export function eligibleProducts(products: Product[], ctx: SimulationContext): Product[] {
  return products.filter((p) => ineligibleReason(p, ctx) === null);
}
