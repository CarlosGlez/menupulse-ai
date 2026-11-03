import type { SimulationContext } from "../ai/context";
import type { LinUCBModel } from "../ai/linucb";
import type { RankedItem, RankMode } from "../ai/rank";
import type { TrainingResult } from "../ai/train";
import type { BrandSlug, InteractionEventType, MenuData, SourceMode } from "../types";

export interface StoredModel {
  model: LinUCBModel;
  revision: number;
  updatedAt: string | null;
}

export interface StoredRun {
  id: string;
  brandId: string;
  sessionId: string | null;
  mode: RankMode;
  context: SimulationContext;
  rankedItems: RankedItem[];
  observationClosed: boolean;
  createdAt: string;
}

export interface NewEvent {
  sessionId: string | null;
  runId: string | null;
  brandId: string;
  productId: string | null;
  eventType: InteractionEventType;
  sourceMode: SourceMode;
  reward: number | null;
  data?: Record<string, unknown>;
}

export interface NewOrder {
  brandId: string;
  sessionId: string | null;
  runId: string | null;
  orderNumber: string;
  subtotal: number;
  total: number;
  context: SimulationContext;
  items: { productId: string; name: string; quantity: number; unitPrice: number; modifiers: Record<string, string[]>; lineTotal: number }[];
}

export interface TrainingRunSummary {
  id: string;
  customers: number;
  seed: number;
  scenarioName: string | null;
  createdAt: string;
  trainingEventsAfter: number;
  result: Omit<TrainingResult, "observations">;
}

export interface Repo {
  readonly kind: "supabase" | "memory";
  getMenu(slug: BrandSlug): Promise<MenuData | null>;
  setAvailability(productId: string, patch: { isAvailable?: boolean; stockDemo?: number | null }): Promise<void>;

  loadModel(brandId: string): Promise<StoredModel>;
  /** Guarda con control optimista: falla (false) si otro proceso lo modificó desde `revision`. */
  saveModel(brandId: string, model: LinUCBModel, revision: number): Promise<boolean>;
  resetModel(brandId: string): Promise<void>;

  createSession(args: { brandId: string; mode: SourceMode; scenarioName: string | null; context: SimulationContext }): Promise<string>;
  createRun(args: { brandId: string; sessionId: string | null; mode: RankMode; context: SimulationContext; rankedItems: RankedItem[]; latencyMs: number }): Promise<string>;
  getRun(id: string): Promise<StoredRun | null>;
  /** Marca la observación como cerrada; devuelve false si ya estaba cerrada (idempotencia). */
  closeRun(id: string): Promise<boolean>;
  listRuns(brandId: string, limit: number): Promise<StoredRun[]>;

  insertEvents(events: NewEvent[]): Promise<void>;
  getRunEvents(runId: string): Promise<{ productId: string | null; eventType: InteractionEventType }[]>;

  insertOrder(order: NewOrder): Promise<string>;
  getOrder(orderId: string): Promise<{ id: string; brandId: string; runId: string | null; rating: number | null; items: { productId: string; quantity: number }[] } | null>;
  /** Descuenta stock demo (nunca baja de 0; null = sin control de stock). */
  decrementStock(productId: string, quantity: number): Promise<void>;
  rateOrder(orderId: string, rating: number): Promise<void>;

  insertTrainingRun(args: { brandId: string; sessionId: string | null; scenarioName: string | null; result: TrainingResult }): Promise<void>;
  listTrainingRuns(brandId: string, limit: number): Promise<TrainingRunSummary[]>;
  countEvents(brandId: string): Promise<Record<SourceMode, number>>;
  analytics(brandId: string): Promise<RawAnalytics>;
}

export interface RawAnalytics {
  events: { sourceMode: SourceMode; eventType: InteractionEventType; productId: string | null; n: number }[];
  orders: { orders: number; avgTotal: number; avgRating: number | null; rated: number };
}
