// Ranking: elegibilidad → vector de características → LinUCB → ajuste operativo → orden + explicación.
import type { Category, Product } from "../types";
import { operationalPressure, type SimulationContext } from "./context";
import { ineligibleReason, type IneligibleReason } from "./eligibility";
import { buildFeatures, type FeatureEnv } from "./features";
import { scoreArm, type LinUCBModel } from "./linucb";
import { explain, type Reason } from "./explain";

/** Peso DEMO de la penalización por tiempo de preparación en hora pico. */
export const PREP_PENALTY_WEIGHT = 0.15;
/** Observaciones mínimas para considerar que un producto ya usa el "modelo entrenado". */
export const MIN_TRAINED_OBS = 5;

export type RankMode = "adaptive" | "baseline";

export interface RankedItem {
  productId: string;
  position: number;
  score: number;
  expected: number;
  exploration: number;
  operationalPenalty: number;
  observations: number;
  source: "initial" | "trained" | "baseline";
  reasons: Reason[];
  /** Vector usado (necesario para actualizar el modelo después). */
  features: number[];
}

export interface RankResult {
  mode: RankMode;
  items: RankedItem[];
  ineligible: { productId: string; reason: IneligibleReason }[];
}

export function prepPenalty(p: Product, ctx: SimulationContext): number {
  if (p.prepTimeSeconds === null) return 0; // solo si está configurado
  return PREP_PENALTY_WEIGHT * operationalPressure(ctx) * Math.min(1, p.prepTimeSeconds / 900);
}

export function buildEnv(categories: Category[], products: Product[], ctx: SimulationContext): FeatureEnv {
  const ids = new Set(ctx.cartProductIds);
  return {
    categorySlugById: new Map(categories.map((c) => [c.id, c.slug])),
    cartProducts: products.filter((p) => ids.has(p.id)),
  };
}

/** Orden fijo de referencia: orden de categoría y luego orden del catálogo. */
function baselineOrder(products: Product[], categories: Category[]): Product[] {
  const order = new Map(categories.map((c) => [c.id, c.sortOrder]));
  return products
    .map((p, i) => ({ p, i }))
    .sort((a, b) => (order.get(a.p.categoryId) ?? 0) - (order.get(b.p.categoryId) ?? 0) || a.i - b.i)
    .map(({ p }) => p);
}

export function rankProducts(args: {
  products: Product[];
  categories: Category[];
  ctx: SimulationContext;
  model: LinUCBModel;
  mode: RankMode;
}): RankResult {
  const { products, categories, ctx, model, mode } = args;
  const env = buildEnv(categories, products, ctx);
  const ineligible: RankResult["ineligible"] = [];
  const eligible: Product[] = [];
  for (const p of baselineOrder(products, categories)) {
    const r = ineligibleReason(p, ctx);
    if (r) ineligible.push({ productId: p.id, reason: r });
    else eligible.push(p);
  }

  const scored = eligible.map((p, baseIndex) => {
    const x = buildFeatures(p, ctx, env);
    if (mode === "baseline") {
      return {
        p,
        baseIndex,
        item: {
          productId: p.id,
          position: 0,
          score: 0,
          expected: 0,
          exploration: 0,
          operationalPenalty: 0,
          observations: 0,
          source: "baseline" as const,
          reasons: [{ kind: "baseline" as const, text: "Orden fijo del menú (sin IA)" }],
          features: x,
        },
      };
    }
    const s = scoreArm(model, p.id, x);
    const penalty = prepPenalty(p, ctx);
    return {
      p,
      baseIndex,
      item: {
        productId: p.id,
        position: 0,
        score: s.score - penalty,
        expected: s.expected,
        exploration: s.exploration,
        operationalPenalty: penalty,
        observations: s.n,
        source: s.n >= MIN_TRAINED_OBS ? ("trained" as const) : ("initial" as const),
        reasons: explain({ product: p, ctx, x, score: s, penalty, env }),
        features: x,
      },
    };
  });

  if (mode === "adaptive") {
    // Desempate estable por el orden de referencia.
    scored.sort((a, b) => b.item.score - a.item.score || a.baseIndex - b.baseIndex);
  }
  const items = scored.map((s, i) => ({ ...s.item, position: i + 1 }));
  return { mode, items, ineligible };
}
