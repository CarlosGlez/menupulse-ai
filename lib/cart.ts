// Lógica pura de personalización y precios. La usan el cliente (vista previa) y el servidor
// (precio definitivo de la orden). El precio SIEMPRE se recalcula desde el catálogo.
import type { ModifierGroup, Product } from "./types";

export type Selections = Record<string, string[]>;

export interface CartLine {
  key: string;
  productId: string;
  name: string;
  quantity: number;
  selections: Selections;
  unitPrice: number;
}

export const MAX_QTY = 20;

/** Grupos que aplican con las selecciones actuales (respeta dependsOn). */
export function activeGroups(product: Product, selections: Selections): ModifierGroup[] {
  return product.modifiers.filter(
    (g) => !g.dependsOn || (selections[g.dependsOn.groupId] ?? []).includes(g.dependsOn.optionId),
  );
}

export function defaultSelections(product: Product): Selections {
  const s: Selections = {};
  for (const g of product.modifiers) {
    if (g.type === "single") s[g.id] = [g.defaultOptionId ?? g.options[0].id];
    else s[g.id] = [];
  }
  return s;
}

/** Errores de validación legibles; arreglo vacío = válido. */
export function validateSelections(product: Product, selections: Selections): string[] {
  const errors: string[] = [];
  const groups = activeGroups(product, selections);
  const known = new Set(product.modifiers.map((g) => g.id));
  for (const key of Object.keys(selections)) if (!known.has(key)) errors.push(`Opción desconocida: ${key}`);
  for (const g of groups) {
    const chosen = selections[g.id] ?? [];
    const valid = new Set(g.options.map((o) => o.id));
    if (chosen.some((c) => !valid.has(c))) errors.push(`Opción inválida en ${g.label}`);
    if (new Set(chosen).size !== chosen.length) errors.push(`Opción repetida en ${g.label}`);
    if (g.type === "single" && chosen.length !== 1) errors.push(`Elige una opción en ${g.label}`);
    if (g.type === "multi") {
      if (g.required && chosen.length === 0) errors.push(`Elige al menos una opción en ${g.label}`);
      if (g.max !== undefined && chosen.length > g.max) errors.push(`Máximo ${g.max} en ${g.label}`);
    }
  }
  return errors;
}

/** Precio unitario DEMO = base + diferencias de las opciones activas. */
export function unitPrice(product: Product, selections: Selections): number {
  if (product.price === null) throw new Error("Producto sin precio demo");
  let total = product.price;
  for (const g of activeGroups(product, selections)) {
    for (const id of selections[g.id] ?? []) total += g.options.find((o) => o.id === id)?.priceDelta ?? 0;
  }
  return Math.round(total * 100) / 100;
}

/** Solo conserva las selecciones de grupos activos (p. ej. quita tamaño de combo si ya no es combo). */
export function normalizeSelections(product: Product, selections: Selections): Selections {
  const out: Selections = {};
  for (const g of activeGroups(product, selections)) out[g.id] = [...(selections[g.id] ?? [])];
  return out;
}

export function describeSelections(product: Product, selections: Selections): string {
  return activeGroups(product, selections)
    .flatMap((g) => (selections[g.id] ?? []).map((id) => g.options.find((o) => o.id === id)?.label))
    .filter(Boolean)
    .join(", ");
}

export function lineKey(productId: string, selections: Selections): string {
  const parts = Object.keys(selections)
    .sort()
    .map((k) => `${k}=${[...selections[k]].sort().join("+")}`);
  return `${productId}|${parts.join(";")}`;
}

export function cartTotals(lines: CartLine[]) {
  const subtotal = Math.round(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0) * 100) / 100;
  // No hay promociones configuradas todavía: total = subtotal. (No se inventan descuentos.)
  return { subtotal, discount: 0, total: subtotal, items: lines.reduce((s, l) => s + l.quantity, 0) };
}

export const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
