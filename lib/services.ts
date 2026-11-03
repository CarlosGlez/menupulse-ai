import "server-only";
import { performance } from "node:perf_hooks";
import { SCENARIOS, type SimulationContext } from "./ai/context";
import { updateArm, type LinUCBModel } from "./ai/linucb";
import { rankProducts, type RankMode } from "./ai/rank";
import { REWARD_TABLE, rewardForEvents } from "./ai/reward";
import { TOP_K, trainBatch } from "./ai/train";
import { getRepo } from "./repo";
import { ineligibleReason } from "./ai/eligibility";
import { MAX_QTY, cartTotals, normalizeSelections, unitPrice, validateSelections, type Selections } from "./cart";
import type { NewEvent } from "./repo/types";
import type { BrandSlug, InteractionEventType, MenuData } from "./types";

import { HttpError } from "./errors";
export { HttpError };

async function menuOrThrow(slug: BrandSlug): Promise<MenuData> {
  const menu = await getRepo().getMenu(slug);
  if (!menu) throw new HttpError(404, "Marca no encontrada");
  return menu;
}

/** Carga → modifica → guarda con control de concurrencia optimista (reintenta si hubo conflicto). */
async function withModel<T>(brandId: string, fn: (m: LinUCBModel) => T): Promise<{ result: T; model: LinUCBModel }> {
  const repo = getRepo();
  for (let attempt = 0; attempt < 4; attempt++) {
    const { model, revision } = await repo.loadModel(brandId);
    const result = fn(model);
    if (await repo.saveModel(brandId, model, revision)) return { result, model };
  }
  throw new HttpError(409, "El modelo está siendo actualizado por otra solicitud; intenta de nuevo");
}

export async function recommend(args: {
  brand: BrandSlug;
  context: SimulationContext;
  mode: RankMode;
  sessionId: string | null;
  scenarioName: string | null;
  persist: boolean;
  /** false = guarda la ejecución en el historial pero sin impresiones (vistas previas del simulador). */
  logImpressions?: boolean;
}) {
  const repo = getRepo();
  const menu = await menuOrThrow(args.brand);
  const { model, updatedAt } = await repo.loadModel(menu.brand.id);
  const t0 = performance.now();
  const ranking = rankProducts({ products: menu.products, categories: menu.categories, ctx: args.context, model, mode: args.mode });
  const latencyMs = Math.round((performance.now() - t0) * 1000) / 1000;

  let sessionId = args.sessionId;
  let runId: string | null = null;
  if (args.persist) {
    sessionId ??= await repo.createSession({ brandId: menu.brand.id, mode: "interactive_demo", scenarioName: args.scenarioName, context: args.context });
    runId = await repo.createRun({ brandId: menu.brand.id, sessionId, mode: args.mode, context: args.context, rankedItems: ranking.items, latencyMs });
    // Impresiones de los productos destacados.
    if (args.logImpressions !== false) await repo.insertEvents(
      ranking.items.slice(0, TOP_K).map((it) => ({
        sessionId,
        runId,
        brandId: menu.brand.id,
        productId: it.productId,
        eventType: "impression" as const,
        sourceMode: "interactive_demo" as const,
        reward: 0,
        data: { position: it.position },
      })),
    );
  }

  return {
    brand: menu.brand.slug,
    mode: args.mode,
    sessionId,
    runId,
    latencyMs,
    topK: TOP_K,
    model: { trainingEvents: model.trainingEvents, alpha: model.alpha, updatedAt, storage: repo.kind },
    items: ranking.items.map(({ features: _f, ...rest }) => {
      void _f;
      return rest;
    }),
    ineligible: ranking.ineligible,
  };
}

/** Registra un evento del usuario. La recompensa NO viene del cliente: se deriva del tipo de evento. */
export async function recordInteraction(args: { runId: string; productId: string; eventType: InteractionEventType }) {
  const repo = getRepo();
  const run = await repo.getRun(args.runId);
  if (!run) throw new HttpError(404, "Recomendación no encontrada");
  if (run.observationClosed) throw new HttpError(409, "La observación de esta recomendación ya se cerró");
  if (!run.rankedItems.some((i) => i.productId === args.productId)) throw new HttpError(400, "El producto no pertenece a esta recomendación");
  await repo.insertEvents([
    {
      sessionId: run.sessionId,
      runId: run.id,
      brandId: run.brandId,
      productId: args.productId,
      eventType: args.eventType,
      sourceMode: "interactive_demo",
      reward: REWARD_TABLE[args.eventType],
    },
  ]);
  return { ok: true };
}

/**
 * Cierra la observación de una recomendación: calcula la recompensa de cada producto destacado
 * (top-K) a partir de sus eventos y actualiza el modelo una sola vez. Idempotente.
 */
export async function closeObservation(runId: string) {
  const repo = getRepo();
  const run = await repo.getRun(runId);
  if (!run) throw new HttpError(404, "Recomendación no encontrada");
  if (run.mode !== "adaptive") {
    await repo.closeRun(runId);
    return { updated: 0, rewards: [], reason: "baseline: el orden fijo no aprende" };
  }
  if (!(await repo.closeRun(runId))) return { updated: 0, rewards: [], reason: "ya estaba cerrada" };

  const events = await repo.getRunEvents(runId);
  const shown = run.rankedItems.slice(0, TOP_K);
  const rewards = shown.map((it) => ({
    productId: it.productId,
    reward: rewardForEvents(events.filter((e) => e.productId === it.productId).map((e) => e.eventType)),
  }));
  // Productos no destacados que el usuario sí eligió desde el menú completo también aportan señal.
  const extra = run.rankedItems
    .slice(TOP_K)
    .filter((it) => events.some((e) => e.productId === it.productId && e.eventType !== "impression"))
    .map((it) => ({ productId: it.productId, reward: rewardForEvents(events.filter((e) => e.productId === it.productId).map((e) => e.eventType)) }));
  const all = [...rewards, ...extra];
  const byId = new Map(run.rankedItems.map((i) => [i.productId, i]));

  const { model } = await withModel(run.brandId, (m) => {
    for (const r of all) updateArm(m, r.productId, byId.get(r.productId)!.features, r.reward);
  });
  return { updated: all.length, rewards: all, trainingEvents: model.trainingEvents };
}

export async function runTraining(args: { brand: BrandSlug; customers: number; seed: number; scenarioId: string | null }) {
  const repo = getRepo();
  const menu = await menuOrThrow(args.brand);
  const scenario = args.scenarioId ? SCENARIOS.find((s) => s.id === args.scenarioId) : undefined;
  if (args.scenarioId && !scenario) throw new HttpError(400, "Escenario desconocido");

  const { result } = await withModel(menu.brand.id, (m) =>
    trainBatch({ products: menu.products, categories: menu.categories, model: m, n: args.customers, seed: args.seed, scenario }),
  );

  const sessionId = await repo.createSession({
    brandId: menu.brand.id,
    mode: "synthetic_batch",
    scenarioName: scenario?.name ?? "Contextos aleatorios",
    context: scenario ? { ...scenario.context, cartProductIds: [] } : { ...result.observations[0].ctx, cartProductIds: [] },
  });
  const events: NewEvent[] = result.observations.flatMap((o) =>
    o.events.map((e, i) => ({
      sessionId,
      runId: null,
      brandId: menu.brand.id,
      productId: o.productId,
      eventType: e,
      sourceMode: "synthetic_batch" as const,
      reward: REWARD_TABLE[e],
      data: i === 0 ? { position: o.position, observation_reward: o.reward, context: o.ctx } : {},
    })),
  );
  await repo.insertEvents(events);
  await repo.insertTrainingRun({ brandId: menu.brand.id, sessionId, scenarioName: scenario?.name ?? null, result });

  const { observations: _o, ...summary } = result;
  void _o;
  return { ...summary, eventsRecorded: events.length, storage: repo.kind, label: "DATOS SIMULADOS" };
}

export async function resetModel(brand: BrandSlug) {
  const menu = await menuOrThrow(brand);
  await getRepo().resetModel(menu.brand.id);
  return { ok: true };
}

export async function modelStatus(brand: BrandSlug) {
  const repo = getRepo();
  const menu = await menuOrThrow(brand);
  const [{ model, updatedAt }, counts, training] = await Promise.all([
    repo.loadModel(menu.brand.id),
    repo.countEvents(menu.brand.id),
    repo.listTrainingRuns(menu.brand.id, 20),
  ]);
  return {
    brand,
    storage: repo.kind,
    algorithm: model.algorithm,
    modelVersion: model.modelVersion,
    featureVersion: model.featureVersion,
    alpha: model.alpha,
    trainingEvents: model.trainingEvents,
    armsWithData: Object.keys(model.arms).length,
    updatedAt,
    events: counts,
    trainingRuns: training,
    scenarios: SCENARIOS,
  };
}

// ---------- Órdenes DEMO ----------


export async function placeOrder(args: {
  brand: BrandSlug;
  runId: string | null;
  sessionId: string | null;
  context: SimulationContext;
  items: { productId: string; quantity: number; selections: Selections }[];
}) {
  const repo = getRepo();
  const menu = await menuOrThrow(args.brand);
  const byId = new Map(menu.products.map((p) => [p.id, p]));
  if (!args.items.length) throw new HttpError(400, "El carrito está vacío");

  const lines = args.items.map((it) => {
    const p = byId.get(it.productId);
    if (!p) throw new HttpError(400, "Un producto del carrito no pertenece a esta marca");
    const why = ineligibleReason(p, args.context);
    if (why) throw new HttpError(409, `${p.name} no está disponible (${why.replace(/_/g, " ")})`);
    if (p.stockDemo !== null && p.stockDemo < it.quantity) throw new HttpError(409, `Solo quedan ${p.stockDemo} de ${p.name}`);
    if (it.quantity < 1 || it.quantity > MAX_QTY) throw new HttpError(400, "Cantidad inválida");
    const errors = validateSelections(p, it.selections);
    if (errors.length) throw new HttpError(400, `${p.name}: ${errors[0]}`);
    const selections = normalizeSelections(p, it.selections);
    const price = unitPrice(p, selections); // precio recalculado en servidor, nunca el del cliente
    return { productId: p.id, name: p.name, quantity: it.quantity, unitPrice: price, modifiers: selections, lineTotal: Math.round(price * it.quantity * 100) / 100 };
  });
  const totals = cartTotals(lines.map((l) => ({ key: l.productId, productId: l.productId, name: l.name, quantity: l.quantity, selections: l.modifiers, unitPrice: l.unitPrice })));

  const run = args.runId ? await repo.getRun(args.runId) : null;
  if (run && run.brandId !== menu.brand.id) throw new HttpError(400, "La recomendación no corresponde a esta marca");
  const orderNumber = `DEMO-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const orderId = await repo.insertOrder({
    brandId: menu.brand.id,
    sessionId: run?.sessionId ?? args.sessionId,
    runId: run?.id ?? null,
    orderNumber,
    subtotal: totals.subtotal,
    total: totals.total,
    context: args.context,
    items: lines,
  });
  for (const l of lines) await repo.decrementStock(l.productId, l.quantity);

  // Evento de compra SOLO para productos que se agregaron al carrito mientras esta recomendación
  // estaba activa (así la compra se atribuye a la decisión que la originó).
  if (run && !run.observationClosed) {
    const runEvents = await repo.getRunEvents(run.id);
    const added = new Set(runEvents.filter((e) => e.eventType === "add_to_cart").map((e) => e.productId));
    const bought = [...new Set(lines.map((l) => l.productId))].filter((id) => added.has(id));
    await repo.insertEvents(
      bought.map((productId) => ({ sessionId: run.sessionId, runId: run.id, brandId: run.brandId, productId, eventType: "purchase" as const, sourceMode: "interactive_demo" as const, reward: REWARD_TABLE.purchase, data: { orderId } })),
    );
  }
  return { orderId, orderNumber, ...totals, lines, simulated: true };
}

/** Calificación 1–5 (o null = omitir). Registra la señal y cierra la observación para que el modelo aprenda. */
export async function orderFeedback(args: { orderId: string; rating: number | null }) {
  const repo = getRepo();
  const order = await repo.getOrder(args.orderId);
  if (!order) throw new HttpError(404, "Orden no encontrada");
  if (order.rating !== null) throw new HttpError(409, "Esta orden ya fue calificada");
  if (args.rating !== null) await repo.rateOrder(order.id, args.rating);

  if (!order.runId) return { learned: null };
  const run = await repo.getRun(order.runId);
  if (run && !run.observationClosed && args.rating !== null && args.rating !== 3) {
    const eventType = args.rating >= 4 ? ("rating_positive" as const) : ("rating_negative" as const);
    const purchased = new Set((await repo.getRunEvents(run.id)).filter((e) => e.eventType === "purchase").map((e) => e.productId));
    const products = [...new Set(order.items.map((i) => i.productId))].filter((id) => purchased.has(id));
    await repo.insertEvents(products.map((productId) => ({ sessionId: run.sessionId, runId: run.id, brandId: run.brandId, productId, eventType, sourceMode: "interactive_demo" as const, reward: REWARD_TABLE[eventType], data: { orderId: order.id, rating: args.rating } })));
  }
  return { learned: await closeObservation(order.runId) };
}

// ---------- Analítica e historial (panel) ----------

export interface SourceMetrics {
  impressions: number;
  clicks: number;
  addToCart: number;
  purchases: number;
  ratingPositive: number;
  ratingNegative: number;
  ctr: number;
  addToCartRate: number;
  conversion: number;
}

export async function brandAnalytics(brand: BrandSlug) {
  const repo = getRepo();
  const menu = await menuOrThrow(brand);
  const [raw, training, status] = await Promise.all([repo.analytics(menu.brand.id), repo.listTrainingRuns(menu.brand.id, 50), repo.loadModel(menu.brand.id)]);
  const names = new Map(menu.products.map((p) => [p.id, p.name]));
  const bySource = (mode: "interactive_demo" | "synthetic_batch"): SourceMetrics => {
    const sum = (t: string) => raw.events.filter((e) => e.sourceMode === mode && e.eventType === t).reduce((s, e) => s + e.n, 0);
    const impressions = sum("impression");
    const clicks = sum("click");
    const addToCart = sum("add_to_cart");
    const purchases = sum("purchase");
    const r = (a: number) => (impressions ? Math.round((a / impressions) * 10000) / 10000 : 0);
    return { impressions, clicks, addToCart, purchases, ratingPositive: sum("rating_positive"), ratingNegative: sum("rating_negative"), ctr: r(clicks), addToCartRate: r(addToCart), conversion: r(purchases) };
  };
  const topProducts = (mode: "interactive_demo" | "synthetic_batch") => {
    const m = new Map<string, number>();
    for (const e of raw.events) if (e.sourceMode === mode && e.eventType === "purchase" && e.productId) m.set(e.productId, (m.get(e.productId) ?? 0) + e.n);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, n]) => ({ productId: id, name: names.get(id) ?? "Producto retirado", purchases: n }));
  };
  return {
    brand,
    storage: repo.kind,
    label: "DATOS SIMULADOS — no son ventas reales",
    interactive: { ...bySource("interactive_demo"), topProducts: topProducts("interactive_demo"), orders: raw.orders },
    synthetic: { ...bySource("synthetic_batch"), topProducts: topProducts("synthetic_batch") },
    model: { trainingEvents: status.model.trainingEvents, updatedAt: status.updatedAt, arms: Object.keys(status.model.arms).length },
    trainingRuns: training.reverse(), // cronológico
  };
}

export async function recommendationHistory(brand: BrandSlug, limit = 30) {
  const repo = getRepo();
  const menu = await menuOrThrow(brand);
  const names = new Map(menu.products.map((p) => [p.id, p.name]));
  const runs = await repo.listRuns(menu.brand.id, Math.min(100, limit));
  return runs.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    mode: r.mode,
    context: r.context,
    closed: r.observationClosed,
    top: r.rankedItems.slice(0, TOP_K).map((i) => ({ name: names.get(i.productId) ?? "Producto retirado", score: Math.round(i.score * 1000) / 1000, source: i.source, reasons: i.reasons.map((x) => x.text) })),
  }));
}
