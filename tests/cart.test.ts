import { describe, expect, it } from "vitest";
import { cartTotals, defaultSelections, lineKey, normalizeSelections, unitPrice, validateSelections } from "@/lib/cart";
import { getStaticMenu } from "@/lib/data/catalog";

const byslug = (brand: Parameters<typeof getStaticMenu>[0], slug: string) =>
  getStaticMenu(brand).products.find((p) => p.slug === slug)!;

describe("personalización y precio", () => {
  it("pizza grande + orilla rellena + 2 extras", () => {
    const p = byslug("dominos", "mexicana");
    const s = { tamano: ["grande"], masa: ["orilla-rellena"], extras: ["jamon", "extra-queso"] };
    expect(validateSelections(p, s)).toEqual([]);
    expect(unitPrice(p, s)).toBe(229 + 60 + 35 + 20 + 25);
  });

  it("arma tu pizza exige al menos un ingrediente y máximo 4", () => {
    const p = byslug("dominos", "arma-tu-pizza");
    expect(validateSelections(p, defaultSelections(p)).length).toBeGreaterThan(0);
    const five = { ...defaultSelections(p), ingredientes: ["pepperoni", "jamon", "champinones", "pimiento", "cebolla"] };
    expect(validateSelections(p, five)).toContain("Máximo 4 en Ingredientes");
  });

  it("los grupos del combo solo aplican si se elige combo", () => {
    const p = byslug("carls-jr", "famous-star");
    const individual = defaultSelections(p);
    expect(unitPrice(p, individual)).toBe(119);
    expect(normalizeSelections(p, individual)).not.toHaveProperty("tamano-combo");
    const combo = { ...individual, presentacion: ["combo"], "tamano-combo": ["grande"] };
    expect(validateSelections(p, combo)).toEqual([]);
    expect(unitPrice(p, combo)).toBe(119 + 65 + 20);
  });

  it("rechaza opciones inexistentes o de otro producto", () => {
    const p = byslug("degas-cafe", "cappuccino");
    expect(validateSelections(p, { ...defaultSelections(p), leche: ["oro"] }).length).toBeGreaterThan(0);
    expect(validateSelections(p, { ...defaultSelections(p), masa: ["delgada"] }).length).toBeGreaterThan(0);
  });

  it("la llave de línea no depende del orden de selección", () => {
    expect(lineKey("x", { a: ["2", "1"], b: ["z"] })).toBe(lineKey("x", { b: ["z"], a: ["1", "2"] }));
  });

  it("totales", () => {
    const t = cartTotals([
      { key: "a", productId: "a", name: "A", quantity: 2, selections: {}, unitPrice: 59.5 },
      { key: "b", productId: "b", name: "B", quantity: 1, selections: {}, unitPrice: 35 },
    ]);
    expect(t).toEqual({ subtotal: 154, discount: 0, total: 154, items: 3 });
  });
});
