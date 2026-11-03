// Repositorio EN MEMORIA para desarrollo sin Supabase. NO es persistente: se pierde al reiniciar
// el servidor. La interfaz lo indica claramente; la entrega final usa Supabase.
import { randomUUID } from "node:crypto";
import { createModel, ensureCompatible } from "../ai/linucb";
import { BRANDS, CATEGORIES, PRODUCTS } from "../data/catalog";
import type { Product, SourceMode } from "../types";
import type { NewEvent, NewOrder, Repo, StoredModel, StoredRun, TrainingRunSummary } from "./types";

interface MemState {
  products: Product[];
  models: Map<string, StoredModel>;
  runs: Map<string, StoredRun>;
  events: (NewEvent & { createdAt: string })[];
  orders: Map<string, NewOrder & { rating: number | null }>;
  training: (TrainingRunSummary & { brandId: string })[];
}

const g = globalThis as unknown as { __menupulseMem?: MemState };
function state(): MemState {
  if (!g.__menupulseMem) {
    g.__menupulseMem = {
      products: PRODUCTS.map((p) => ({ ...p })),
      models: new Map(),
      runs: new Map(),
      events: [],
      orders: new Map(),
      training: [],
    };
  }
  return g.__menupulseMem;
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export const memoryRepo: Repo = {
  kind: "memory",

  async getMenu(slug) {
    const brand = BRANDS.find((b) => b.slug === slug);
    if (!brand) return null;
    return {
      brand,
      categories: CATEGORIES.filter((c) => c.brandId === brand.id),
      products: state().products.filter((p) => p.brandId === brand.id && p.isActive),
    };
  },

  async setAvailability(productId, patch) {
    const p = state().products.find((x) => x.id === productId);
    if (!p) throw new Error("Producto no encontrado");
    if (patch.isAvailable !== undefined) p.isAvailable = patch.isAvailable;
    if (patch.stockDemo !== undefined) p.stockDemo = patch.stockDemo;
  },

  async loadModel(brandId) {
    const s = state().models.get(brandId);
    if (!s) return { model: createModel(), revision: 0, updatedAt: null };
    return { model: ensureCompatible(clone(s.model)), revision: s.revision, updatedAt: s.updatedAt };
  },

  async saveModel(brandId, model, revision) {
    const cur = state().models.get(brandId);
    if ((cur?.revision ?? 0) !== revision) return false;
    state().models.set(brandId, { model: clone(model), revision: revision + 1, updatedAt: new Date().toISOString() });
    return true;
  },

  async resetModel(brandId) {
    const cur = state().models.get(brandId);
    state().models.set(brandId, { model: createModel(), revision: (cur?.revision ?? 0) + 1, updatedAt: new Date().toISOString() });
  },

  async createSession() {
    return randomUUID();
  },

  async createRun(args) {
    const id = randomUUID();
    state().runs.set(id, {
      id,
      brandId: args.brandId,
      sessionId: args.sessionId,
      mode: args.mode,
      context: args.context,
      rankedItems: args.rankedItems,
      observationClosed: false,
      createdAt: new Date().toISOString(),
    });
    return id;
  },

  async getRun(id) {
    return state().runs.get(id) ?? null;
  },

  async closeRun(id) {
    const r = state().runs.get(id);
    if (!r || r.observationClosed) return false;
    r.observationClosed = true;
    return true;
  },

  async listRuns(brandId, limit) {
    return [...state().runs.values()]
      .filter((r) => r.brandId === brandId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  },

  async insertEvents(events) {
    const now = new Date().toISOString();
    state().events.push(...events.map((e) => ({ ...e, createdAt: now })));
  },

  async getRunEvents(runId) {
    return state()
      .events.filter((e) => e.runId === runId)
      .map((e) => ({ productId: e.productId, eventType: e.eventType }));
  },

  async insertOrder(order) {
    const id = randomUUID();
    state().orders.set(id, { ...order, rating: null });
    return id;
  },

  async getOrder(orderId) {
    const o = state().orders.get(orderId);
    if (!o) return null;
    return { id: orderId, brandId: o.brandId, runId: o.runId, rating: o.rating, items: o.items.map((i) => ({ productId: i.productId, quantity: i.quantity })) };
  },

  async decrementStock(productId, quantity) {
    const p = state().products.find((x) => x.id === productId);
    if (p && p.stockDemo !== null) p.stockDemo = Math.max(0, p.stockDemo - quantity);
  },

  async rateOrder(orderId, rating) {
    const o = state().orders.get(orderId);
    if (o) o.rating = rating;
  },

  async insertTrainingRun({ brandId, scenarioName, result }) {
    const { observations: _omit, ...rest } = result;
    void _omit;
    state().training.push({
      id: randomUUID(),
      brandId,
      customers: result.customers,
      seed: result.seed,
      scenarioName,
      createdAt: new Date().toISOString(),
      trainingEventsAfter: result.trainingEventsAfter,
      result: rest,
    });
  },

  async listTrainingRuns(brandId, limit) {
    return state()
      .training.filter((t) => t.brandId === brandId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  },

  async analytics(brandId) {
    const map = new Map<string, { sourceMode: SourceMode; eventType: NewEvent["eventType"]; productId: string | null; n: number }>();
    for (const e of state().events) {
      if (e.brandId !== brandId) continue;
      const k = `${e.sourceMode}|${e.eventType}|${e.productId}`;
      const cur = map.get(k) ?? { sourceMode: e.sourceMode, eventType: e.eventType, productId: e.productId, n: 0 };
      cur.n += 1;
      map.set(k, cur);
    }
    const orders = [...state().orders.values()].filter((o) => o.brandId === brandId);
    const rated = orders.filter((o) => o.rating !== null);
    return {
      events: [...map.values()],
      orders: {
        orders: orders.length,
        avgTotal: orders.length ? orders.reduce((s, o) => s + o.total, 0) / orders.length : 0,
        avgRating: rated.length ? rated.reduce((s, o) => s + (o.rating ?? 0), 0) / rated.length : null,
        rated: rated.length,
      },
    };
  },

  async countEvents(brandId) {
    const out: Record<SourceMode, number> = { interactive_demo: 0, synthetic_batch: 0 };
    for (const e of state().events) if (e.brandId === brandId) out[e.sourceMode] += 1;
    return out;
  },
};
