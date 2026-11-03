import { describe, expect, it } from "vitest";
import { cholesky, choleskySolve, identity, addOuterInPlace } from "@/lib/ai/linalg";
import { createModel, ensureCompatible, scoreArm, updateArm, clampReward } from "@/lib/ai/linucb";
import { FEATURE_DIM, buildFeatures, FEATURE_VERSION } from "@/lib/ai/features";
import { rewardForEvents } from "@/lib/ai/reward";
import { rankProducts, buildEnv } from "@/lib/ai/rank";
import { DEFAULT_CONTEXT, SCENARIOS, type SimulationContext } from "@/lib/ai/context";
import { trainBatch } from "@/lib/ai/train";
import { getStaticMenu } from "@/lib/data/catalog";
import { BRAND_SLUGS } from "@/lib/types";

describe("álgebra lineal", () => {
  it("Cholesky resuelve A y = v", () => {
    const d = 3;
    const A = identity(d);
    addOuterInPlace(A, [1, 2, 3]);
    const L = cholesky(A, d);
    const y = choleskySolve(L, [1, 0, 0]);
    // Verifica A y ≈ e1
    const Ay = [0, 1, 2].map((i) => [0, 1, 2].reduce((s, j) => s + A[i * d + j] * y[j], 0));
    expect(Ay[0]).toBeCloseTo(1, 10);
    expect(Ay[1]).toBeCloseTo(0, 10);
    expect(Ay[2]).toBeCloseTo(0, 10);
  });
});

describe("LinUCB", () => {
  const x = Array.from({ length: FEATURE_DIM }, (_, i) => (i === 0 ? 1 : i % 3 === 0 ? 0.5 : 0));

  it("sin datos: expected = 0 e incertidumbre = ||x||", () => {
    const m = createModel(0.4);
    const s = scoreArm(m, "a", x);
    expect(s.expected).toBe(0);
    expect(s.uncertainty).toBeCloseTo(Math.hypot(...x), 10);
    expect(s.score).toBeCloseTo(0.4 * Math.hypot(...x), 10);
  });

  it("recompensas positivas suben la estimación y bajan la incertidumbre", () => {
    const m = createModel();
    const before = scoreArm(m, "a", x);
    for (let i = 0; i < 20; i++) updateArm(m, "a", x, 0.8);
    const after = scoreArm(m, "a", x);
    expect(after.expected).toBeGreaterThan(0.6);
    expect(after.uncertainty).toBeLessThan(before.uncertainty);
    expect(m.trainingEvents).toBe(20);
  });

  it("el estado sobrevive serialización JSON (persistencia)", () => {
    const m = createModel();
    for (let i = 0; i < 5; i++) updateArm(m, "a", x, i % 2 ? 0.5 : -0.2);
    const restored = ensureCompatible(JSON.parse(JSON.stringify(m)));
    expect(scoreArm(restored, "a", x).score).toBeCloseTo(scoreArm(m, "a", x).score, 12);
  });

  it("reinicia si cambia la versión de características", () => {
    const m = createModel();
    updateArm(m, "a", x, 1);
    const old = { ...m, featureVersion: FEATURE_VERSION + 99 };
    expect(ensureCompatible(old).trainingEvents).toBe(0);
  });

  it("rechaza vectores inválidos y limita recompensas", () => {
    const m = createModel();
    expect(() => scoreArm(m, "a", [1, 2])).toThrow();
    expect(() => updateArm(m, "a", x.map(() => NaN), 1)).toThrow();
    expect(clampReward(5)).toBe(1);
    expect(clampReward(-5)).toBe(-1);
  });
});

describe("recompensa", () => {
  it("cada tipo de evento cuenta una vez", () => {
    expect(rewardForEvents(["click", "click", "click"])).toBeCloseTo(0.1);
    expect(rewardForEvents(["impression"])).toBe(0);
    expect(rewardForEvents(["click", "add_to_cart", "purchase", "rating_positive"])).toBe(1); // 1.1 → clamp
    expect(rewardForEvents(["click", "add_to_cart", "remove_from_cart"])).toBeCloseTo(0.45);
  });
});

describe("elegibilidad y ranking", () => {
  it("un producto agotado nunca aparece en el ranking", () => {
    const menu = getStaticMenu("degas-cafe");
    const products = menu.products.map((p) => (p.slug === "frappe-cookies" ? { ...p, isAvailable: false } : p));
    const target = products.find((p) => p.slug === "frappe-cookies")!;
    const r = rankProducts({ products, categories: menu.categories, ctx: DEFAULT_CONTEXT, model: createModel(), mode: "adaptive" });
    expect(r.items.some((i) => i.productId === target.id)).toBe(false);
    expect(r.ineligible).toContainEqual({ productId: target.id, reason: "agotado" });
  });

  it("respeta horarios: no hay paninis a las 8:00", () => {
    const menu = getStaticMenu("degas-cafe");
    const ctx: SimulationContext = { ...DEFAULT_CONTEXT, hour: 8 };
    const r = rankProducts({ products: menu.products, categories: menu.categories, ctx, model: createModel(), mode: "adaptive" });
    const paninis = menu.products.filter((p) => p.slug.startsWith("panini")).map((p) => p.id);
    expect(r.items.some((i) => paninis.includes(i.productId))).toBe(false);
  });

  it("el vector tiene dimensión fija para todos los productos", () => {
    for (const slug of BRAND_SLUGS) {
      const menu = getStaticMenu(slug);
      const env = buildEnv(menu.categories, menu.products, DEFAULT_CONTEXT);
      for (const p of menu.products) expect(buildFeatures(p, DEFAULT_CONTEXT, env)).toHaveLength(FEATURE_DIM);
    }
  });
});

describe("aprendizaje con clientes simulados", () => {
  it("el modelo entrenado supera al modelo inicial en el mismo set de evaluación", () => {
    const menu = getStaticMenu("degas-cafe");
    const model = createModel();
    let last;
    for (let batch = 0; batch < 5; batch++) {
      last = trainBatch({ products: menu.products, categories: menu.categories, model, n: 200, seed: 100 + batch });
    }
    const first = trainBatch({ products: menu.products, categories: menu.categories, model: createModel(), n: 1, seed: 1 });
    expect(model.trainingEvents).toBeGreaterThan(0);
    expect(last!.evaluation.after.avgReward).toBeGreaterThan(first.evaluation.before.avgReward);
  });

  it("en el escenario 'Día caluroso' Degas aprende a destacar bebidas frías", () => {
    const menu = getStaticMenu("degas-cafe");
    const model = createModel();
    const hot = SCENARIOS.find((s) => s.id === "dia-caluroso")!;
    for (let b = 0; b < 3; b++) trainBatch({ products: menu.products, categories: menu.categories, model, n: 200, seed: 7 + b });
    const ctx: SimulationContext = { ...hot.context, cartProductIds: [] };
    const r = rankProducts({ products: menu.products, categories: menu.categories, ctx, model, mode: "adaptive" });
    const top4 = r.items.slice(0, 4).map((i) => menu.products.find((p) => p.id === i.productId)!);
    const cold = top4.filter((p) => p.tags.includes("cold_drink")).length;
    expect(cold).toBeGreaterThanOrEqual(2);
  });
});
