import "server-only";
import { createModel, ensureCompatible, type LinUCBModel } from "../ai/linucb";
import type { SimulationContext } from "../ai/context";
import type { RankedItem, RankMode } from "../ai/rank";
import { HttpError } from "../errors";
import { getAdminClient } from "../supabase/server";
import type { Brand, Category, InteractionEventType, Product, SourceMode } from "../types";
import type { Repo, StoredRun } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

function must<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(`Supabase: ${res.error.message}`);
  return res.data;
}

function toProduct(r: any): Product {
  return {
    id: r.id,
    brandId: r.brand_id,
    categoryId: r.category_id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    price: r.price === null ? null : Number(r.price),
    currency: "MXN",
    imagePath: r.image_path,
    tags: r.tags ?? [],
    dayparts: r.dayparts ?? [],
    prepTimeSeconds: r.prep_time_seconds,
    isAvailable: r.is_available,
    isActive: r.is_active,
    stockDemo: r.stock_demo,
    dietaryTags: r.dietary_tags ?? [],
    modifiers: r.modifiers ?? [],
    complementCategorySlugs: r.complement_category_slugs ?? [],
    priceSource: r.price_source,
    sourceUrl: r.source_url,
  };
}

function toRun(r: any): StoredRun {
  return {
    id: r.id,
    brandId: r.brand_id,
    sessionId: r.session_id,
    mode: r.mode as RankMode,
    context: r.context as SimulationContext,
    rankedItems: r.ranked_items as RankedItem[],
    observationClosed: r.observation_closed,
    createdAt: r.created_at,
  };
}

export const supabaseRepo: Repo = {
  kind: "supabase",

  async getMenu(slug) {
    const db = getAdminClient();
    const b = must(await db.from("brands").select("*").eq("slug", slug).eq("active", true).maybeSingle()) as any;
    if (!b) return null;
    const [cats, prods] = await Promise.all([
      db.from("categories").select("*").eq("brand_id", b.id).eq("active", true).order("sort_order"),
      db.from("products").select("*").eq("brand_id", b.id).eq("is_active", true).order("created_at"),
    ]);
    const brand: Brand = { id: b.id, slug: b.slug, name: b.name, description: b.description, queueLabel: b.queue_label };
    const categories: Category[] = (must(cats) as any[]).map((c) => ({
      id: c.id,
      brandId: c.brand_id,
      slug: c.slug,
      name: c.name,
      sortOrder: c.sort_order,
    }));
    return { brand, categories, products: (must(prods) as any[]).map(toProduct) };
  },

  async setAvailability(productId, patch) {
    const row: Record<string, unknown> = {};
    if (patch.isAvailable !== undefined) row.is_available = patch.isAvailable;
    if (patch.stockDemo !== undefined) row.stock_demo = patch.stockDemo;
    must(await getAdminClient().from("products").update(row).eq("id", productId));
  },

  async loadModel(brandId) {
    const r = must(await getAdminClient().from("model_states").select("*").eq("brand_id", brandId).maybeSingle()) as any;
    if (!r) return { model: createModel(), revision: 0, updatedAt: null };
    const model: LinUCBModel = {
      algorithm: r.algorithm,
      modelVersion: r.model_version,
      featureVersion: r.feature_version,
      alpha: Number(r.alpha),
      arms: r.parameters?.arms ?? {},
      trainingEvents: r.training_events,
    };
    return { model: ensureCompatible(model), revision: r.revision, updatedAt: r.updated_at };
  },

  async saveModel(brandId, model, revision) {
    const db = getAdminClient();
    const row = {
      brand_id: brandId,
      algorithm: model.algorithm,
      model_version: model.modelVersion,
      feature_version: model.featureVersion,
      alpha: model.alpha,
      parameters: { arms: model.arms },
      training_events: model.trainingEvents,
      revision: revision + 1,
      updated_at: new Date().toISOString(),
    };
    if (revision === 0) {
      const res = await db.from("model_states").insert(row).select("id");
      if (res.error) {
        if (res.error.code === "23505") return false; // otro proceso lo creó primero
        throw new Error(`Supabase: ${res.error.message}`);
      }
      return true;
    }
    const res = must(await db.from("model_states").update(row).eq("brand_id", brandId).eq("revision", revision).select("id"));
    return (res as any[]).length === 1;
  },

  async resetModel(brandId) {
    const db = getAdminClient();
    const cur = must(await db.from("model_states").select("revision").eq("brand_id", brandId).maybeSingle()) as any;
    if (!cur) return;
    const m = createModel();
    must(
      await db
        .from("model_states")
        .update({ parameters: { arms: {} }, training_events: 0, alpha: m.alpha, feature_version: m.featureVersion, model_version: m.modelVersion, revision: cur.revision + 1, updated_at: new Date().toISOString() })
        .eq("brand_id", brandId),
    );
  },

  async createSession({ brandId, mode, scenarioName, context }) {
    const r = must(
      await getAdminClient().from("simulation_sessions").insert({ brand_id: brandId, mode, scenario_name: scenarioName, context }).select("id").single(),
    ) as any;
    return r.id;
  },

  async createRun({ brandId, sessionId, mode, context, rankedItems, latencyMs }) {
    const r = must(
      await getAdminClient()
        .from("recommendation_runs")
        .insert({
          brand_id: brandId,
          session_id: sessionId,
          mode,
          context,
          ranked_items: rankedItems,
          latency_ms: latencyMs,
          model_version: "linucb-v1",
          algorithm: mode === "adaptive" ? "linucb-disjoint" : "baseline-fixed-order",
        })
        .select("id")
        .single(),
    ) as any;
    return r.id;
  },

  async getRun(id) {
    const r = must(await getAdminClient().from("recommendation_runs").select("*").eq("id", id).maybeSingle());
    return r ? toRun(r) : null;
  },

  async closeRun(id) {
    const res = must(
      await getAdminClient().from("recommendation_runs").update({ observation_closed: true }).eq("id", id).eq("observation_closed", false).select("id"),
    ) as any[];
    return res.length === 1;
  },

  async listRuns(brandId, limit) {
    const rows = must(
      await getAdminClient().from("recommendation_runs").select("*").eq("brand_id", brandId).order("created_at", { ascending: false }).limit(limit),
    ) as any[];
    return rows.map(toRun);
  },

  async insertEvents(events) {
    if (!events.length) return;
    const rows = events.map((e) => ({
      session_id: e.sessionId,
      recommendation_run_id: e.runId,
      brand_id: e.brandId,
      product_id: e.productId,
      event_type: e.eventType,
      source_mode: e.sourceMode,
      reward: e.reward,
      event_data: e.data ?? {},
    }));
    const db = getAdminClient();
    for (let i = 0; i < rows.length; i += 500) must(await db.from("interaction_events").insert(rows.slice(i, i + 500)));
  },

  async getRunEvents(runId) {
    const rows = must(
      await getAdminClient().from("interaction_events").select("product_id, event_type").eq("recommendation_run_id", runId),
    ) as any[];
    return rows.map((r) => ({ productId: r.product_id, eventType: r.event_type as InteractionEventType }));
  },

  async insertOrder(o) {
    const db = getAdminClient();
    const r = must(
      await db
        .from("orders_demo")
        .insert({ brand_id: o.brandId, session_id: o.sessionId, recommendation_run_id: o.runId, order_number: o.orderNumber, subtotal: o.subtotal, total: o.total, context: o.context })
        .select("id")
        .single(),
    ) as any;
    must(
      await db.from("order_items_demo").insert(
        o.items.map((i) => ({ order_id: r.id, product_id: i.productId, name: i.name, quantity: i.quantity, unit_price: i.unitPrice, modifiers: i.modifiers, line_total: i.lineTotal })),
      ),
    );
    return r.id;
  },

  async getOrder(orderId) {
    const db = getAdminClient();
    const o = must(await db.from("orders_demo").select("id, brand_id, recommendation_run_id, rating").eq("id", orderId).maybeSingle()) as any;
    if (!o) return null;
    const items = must(await db.from("order_items_demo").select("product_id, quantity").eq("order_id", orderId)) as any[];
    return {
      id: o.id,
      brandId: o.brand_id,
      runId: o.recommendation_run_id,
      rating: o.rating,
      items: items.filter((i) => i.product_id).map((i) => ({ productId: i.product_id, quantity: i.quantity })),
    };
  },

  async decrementStock(productId, quantity) {
    const db = getAdminClient();
    const p = must(await db.from("products").select("stock_demo").eq("id", productId).maybeSingle()) as any;
    if (!p || p.stock_demo === null) return;
    must(await db.from("products").update({ stock_demo: Math.max(0, p.stock_demo - quantity) }).eq("id", productId));
  },

  async rateOrder(orderId, rating) {
    must(await getAdminClient().from("orders_demo").update({ rating }).eq("id", orderId));
  },

  async insertTrainingRun({ brandId, sessionId, scenarioName, result }) {
    const { observations: _omit, ...rest } = result;
    void _omit;
    must(
      await getAdminClient().from("training_runs").insert({
        brand_id: brandId,
        session_id: sessionId,
        customers: result.customers,
        seed: result.seed,
        scenario_name: scenarioName,
        result: rest,
        training_events_after: result.trainingEventsAfter,
      }),
    );
  },

  async listTrainingRuns(brandId, limit) {
    const rows = must(
      await getAdminClient().from("training_runs").select("*").eq("brand_id", brandId).order("created_at", { ascending: false }).limit(limit),
    ) as any[];
    return rows.map((r) => ({
      id: r.id,
      customers: r.customers,
      seed: Number(r.seed),
      scenarioName: r.scenario_name,
      createdAt: r.created_at,
      trainingEventsAfter: r.training_events_after,
      result: r.result,
    }));
  },

  async analytics(brandId) {
    const db = getAdminClient();
    const [ev, ord] = await Promise.all([db.rpc("event_counts", { p_brand: brandId }), db.rpc("order_stats", { p_brand: brandId })]);
    for (const r of [ev, ord]) {
      const err = r.error as { code?: string; message: string } | null;
      if (err && (err.code === "PGRST202" || /could not find the function/i.test(err.message))) {
        throw new HttpError(
          503,
          "A tu base de Supabase le faltan las funciones de analítica. Abre Supabase → SQL Editor, pega el archivo supabase/migrations/20261103000200_analytics.sql y ejecútalo.",
        );
      }
    }
    const events = (must(ev) as any[]).map((r) => ({ sourceMode: r.source_mode as SourceMode, eventType: r.event_type as InteractionEventType, productId: r.product_id, n: Number(r.n) }));
    const o = (must(ord) as any[])[0] ?? {};
    return {
      events,
      orders: { orders: Number(o.orders ?? 0), avgTotal: Number(o.avg_total ?? 0), avgRating: o.avg_rating === null || o.avg_rating === undefined ? null : Number(o.avg_rating), rated: Number(o.rated ?? 0) },
    };
  },

  async countEvents(brandId) {
    const db = getAdminClient();
    const count = async (mode: SourceMode) => {
      const res = await db.from("interaction_events").select("id", { count: "exact", head: true }).eq("brand_id", brandId).eq("source_mode", mode);
      if (res.error) throw new Error(`Supabase: ${res.error.message}`);
      return res.count ?? 0;
    };
    const [a, b] = await Promise.all([count("interactive_demo"), count("synthetic_batch")]);
    return { interactive_demo: a, synthetic_batch: b };
  },
};
