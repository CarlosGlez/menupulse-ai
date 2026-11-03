// Entrenamiento por lotes con clientes simulados + evaluación comparable baseline vs IA.
import type { Category, InteractionEventType, Product } from "../types";
import type { Scenario, SimulationContext } from "./context";
import { buildEnv, rankProducts, type RankMode } from "./rank";
import { complementsCart } from "./features";
import { updateArm, type LinUCBModel } from "./linucb";
import { rewardForEvents } from "./reward";
import { createRng, hiddenUtility, randomContext, simulateResponse } from "./synthetic";

/** Cuántos productos se muestran destacados a cada cliente simulado. */
export const TOP_K = 4;
export const MAX_BATCH = 200;
export const ROUND_SIZE = 10;

export interface Observation {
  ctx: SimulationContext;
  productId: string;
  position: number;
  features: number[];
  events: InteractionEventType[];
  reward: number;
}

export interface PolicyMetrics {
  customers: number;
  impressions: number;
  ctr: number;
  addToCartRate: number;
  conversion: number; // clientes con al menos una compra / clientes
  avgTicket: number; // MXN demo por cliente que compró
  avgReward: number;
  weightedPrepSeconds: number | null; // tiempo de prep. promedio de lo destacado (si configurado)
  diversity: number; // productos distintos destacados / productos elegibles vistos
}

interface Sim {
  customers: { ctx: SimulationContext; observations: Observation[]; spent: number }[];
}

function simulateCustomers(args: {
  products: Product[];
  categories: Category[];
  model: LinUCBModel;
  mode: RankMode;
  contexts: SimulationContext[];
  seed: number;
  learn: boolean;
}): Sim {
  const { products, categories, model, mode, contexts, seed, learn } = args;
  const rng = createRng(seed ^ 0x9e3779b9);
  const byId = new Map(products.map((p) => [p.id, p]));
  const out: Sim = { customers: [] };

  for (const ctx of contexts) {
    const ranking = rankProducts({ products, categories, ctx, model, mode });
    const env = buildEnv(categories, products, ctx);
    const shown = ranking.items.slice(0, TOP_K);
    const observations: Observation[] = [];
    let spent = 0;
    for (const item of shown) {
      const p = byId.get(item.productId)!;
      const u = hiddenUtility(p, ctx, env.cartProducts, complementsCart(p, env));
      const resp = simulateResponse(rng, u, item.position);
      const reward = rewardForEvents(resp.events);
      if (resp.purchased) spent += p.price ?? 0;
      observations.push({ ctx, productId: p.id, position: item.position, features: item.features, events: resp.events, reward });
      if (learn && mode === "adaptive") updateArm(model, p.id, item.features, reward);
    }
    out.customers.push({ ctx, observations, spent });
  }
  return out;
}

export function makeContexts(args: {
  n: number;
  seed: number;
  products: Product[];
  scenario?: Scenario;
}): SimulationContext[] {
  const rng = createRng(args.seed);
  const contexts: SimulationContext[] = [];
  for (let i = 0; i < args.n; i++) {
    const base = randomContext(rng, args.scenario);
    // ~30 % de los clientes ya tienen un producto en el carrito.
    const cart = rng() < 0.3 ? [args.products[Math.floor(rng() * args.products.length)].id] : [];
    contexts.push({ ...base, cartProductIds: cart });
  }
  return contexts;
}

export function metricsOf(sim: Sim, products: Product[]): PolicyMetrics {
  const byId = new Map(products.map((p) => [p.id, p]));
  const obs = sim.customers.flatMap((c) => c.observations);
  const n = sim.customers.length || 1;
  const buyers = sim.customers.filter((c) => c.observations.some((o) => o.events.includes("purchase")));
  const prepVals = obs.map((o) => byId.get(o.productId)?.prepTimeSeconds).filter((v): v is number => v != null);
  const eligibleSeen = new Set(products.map((p) => p.id)).size || 1;
  return {
    customers: sim.customers.length,
    impressions: obs.length,
    ctr: rate(obs.filter((o) => o.events.includes("click")).length, obs.length),
    addToCartRate: rate(obs.filter((o) => o.events.includes("add_to_cart")).length, obs.length),
    conversion: rate(buyers.length, n),
    avgTicket: buyers.length ? round(buyers.reduce((s, c) => s + c.spent, 0) / buyers.length, 2) : 0,
    avgReward: round(obs.reduce((s, o) => s + o.reward, 0) / (obs.length || 1), 4),
    weightedPrepSeconds: prepVals.length ? Math.round(prepVals.reduce((a, b) => a + b, 0) / prepVals.length) : null,
    diversity: rate(new Set(obs.map((o) => o.productId)).size, eligibleSeen),
  };
}

function rate(a: number, b: number) {
  return b ? round(a / b, 4) : 0;
}
function round(n: number, d: number) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function roundCurve(sim: Sim): number[] {
  const curve: number[] = [];
  for (let i = 0; i < sim.customers.length; i += ROUND_SIZE) {
    const obs = sim.customers.slice(i, i + ROUND_SIZE).flatMap((c) => c.observations);
    curve.push(round(obs.reduce((s, o) => s + o.reward, 0) / (obs.length || 1), 4));
  }
  return curve;
}

function cloneModel(m: LinUCBModel): LinUCBModel {
  return JSON.parse(JSON.stringify(m));
}

export interface TrainingResult {
  customers: number;
  seed: number;
  /** Recompensa promedio por ronda de ROUND_SIZE clientes durante el entrenamiento. */
  curve: { adaptive: number[]; baseline: number[] };
  /** Mismos clientes de prueba (semilla fija), sin aprender: antes vs después vs baseline. */
  evaluation: { before: PolicyMetrics; after: PolicyMetrics; baseline: PolicyMetrics; evalCustomers: number };
  observations: Observation[];
  trainingEventsAfter: number;
}

export const EVAL_CUSTOMERS = 200;
export const EVAL_SEED = 20261102;

/** Entrena `model` IN PLACE con n clientes simulados y devuelve evidencia comparable. */
export function trainBatch(args: {
  products: Product[];
  categories: Category[];
  model: LinUCBModel;
  n: number;
  seed: number;
  scenario?: Scenario;
}): TrainingResult {
  const { products, categories, model, seed, scenario } = args;
  const n = Math.max(1, Math.min(MAX_BATCH, Math.floor(args.n)));

  const evalContexts = makeContexts({ n: EVAL_CUSTOMERS, seed: EVAL_SEED, products, scenario });
  const evalPolicy = (m: LinUCBModel, mode: RankMode) =>
    metricsOf(
      simulateCustomers({ products, categories, model: cloneModel(m), mode, contexts: evalContexts, seed: EVAL_SEED, learn: false }),
      products,
    );

  const before = evalPolicy(model, "adaptive");
  const baseline = evalPolicy(model, "baseline");

  const contexts = makeContexts({ n, seed, products, scenario });
  const trainSim = simulateCustomers({ products, categories, model, mode: "adaptive", contexts, seed, learn: true });
  const baseSim = simulateCustomers({ products, categories, model, mode: "baseline", contexts, seed, learn: false });

  const after = evalPolicy(model, "adaptive");

  return {
    customers: n,
    seed,
    curve: { adaptive: roundCurve(trainSim), baseline: roundCurve(baseSim) },
    evaluation: { before, after, baseline, evalCustomers: EVAL_CUSTOMERS },
    observations: trainSim.customers.flatMap((c) => c.observations),
    trainingEventsAfter: model.trainingEvents,
  };
}
