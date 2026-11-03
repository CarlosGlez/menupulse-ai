"use client";
// Estado de la tienda de una marca: contexto simulado, recomendaciones, carrito, eventos y checkout.
// El carrito vive aquí y NUNCA se modifica cuando cambia una recomendación.
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { DEFAULT_CONTEXT, SCENARIOS, type SimulationContext } from "../ai/context";
import { ineligibleReason, type IneligibleReason } from "../ai/eligibility";
import type { Reason } from "../ai/explain";
import { cartTotals, lineKey, type CartLine, type Selections } from "../cart";
import type { InteractionEventType, MenuData, Product } from "../types";

export interface RecItem {
  productId: string;
  position: number;
  score: number;
  expected: number;
  exploration: number;
  operationalPenalty: number;
  observations: number;
  source: "initial" | "trained" | "baseline";
  reasons: Reason[];
}

export interface Recommendation {
  runId: string | null;
  sessionId: string | null;
  latencyMs: number;
  topK: number;
  model: { trainingEvents: number; alpha: number; updatedAt: string | null; storage: "supabase" | "memory" };
  items: RecItem[];
  ineligible: { productId: string; reason: IneligibleReason }[];
}

export interface OrderResult {
  orderId: string;
  orderNumber: string;
  subtotal: number;
  total: number;
  items: number;
}

const CONTEXT_KEY = "menupulse:context";

export function readStoredContext(): { context: SimulationContext; scenarioName: string | null } | null {
  try {
    const raw = window.localStorage.getItem(CONTEXT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeContext(context: SimulationContext, scenarioName: string | null) {
  try {
    window.localStorage.setItem(CONTEXT_KEY, JSON.stringify({ context: { ...context, cartProductIds: [] }, scenarioName }));
    window.dispatchEvent(new Event("menupulse:context"));
  } catch {
    /* almacenamiento no disponible: el contexto queda solo en memoria */
  }
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
  return data as T;
}

type CartAction =
  | { type: "add"; line: CartLine }
  | { type: "replace"; oldKey: string; line: CartLine }
  | { type: "qty"; key: string; quantity: number }
  | { type: "remove"; key: string }
  | { type: "clear" };

function cartReducer(state: CartLine[], a: CartAction): CartLine[] {
  switch (a.type) {
    case "add": {
      const existing = state.find((l) => l.key === a.line.key);
      if (existing) return state.map((l) => (l.key === a.line.key ? { ...l, quantity: Math.min(20, l.quantity + a.line.quantity) } : l));
      return [...state, a.line];
    }
    case "replace": {
      const rest = state.filter((l) => l.key !== a.oldKey);
      return cartReducer(rest, { type: "add", line: a.line });
    }
    case "qty":
      return state.map((l) => (l.key === a.key ? { ...l, quantity: Math.max(1, Math.min(20, a.quantity)) } : l));
    case "remove":
      return state.filter((l) => l.key !== a.key);
    case "clear":
      return [];
  }
}

export function useStorefront(menu: MenuData) {
  const [ctxState, setCtxState] = useState<{ context: SimulationContext; scenarioName: string | null }>({
    context: DEFAULT_CONTEXT,
    scenarioName: null,
  });
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [recError, setRecError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cart, dispatch] = useReducer(cartReducer, []);
  const [complements, setComplements] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | "all">("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const openRun = useRef<string | null>(null);
  const sessionRef = useRef<string | null>(null);

  const productsById = useMemo(() => new Map(menu.products.map((p) => [p.id, p])), [menu.products]);
  const catSlugById = useMemo(() => new Map(menu.categories.map((c) => [c.id, c.slug])), [menu.categories]);

  // Contexto: el que dejó el simulador (o un escenario elegido aquí).
  useEffect(() => {
    const load = () => {
      const stored = readStoredContext();
      if (stored) setCtxState(stored);
    };
    load();
    window.addEventListener("menupulse:context", load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener("menupulse:context", load);
      window.removeEventListener("storage", load);
    };
  }, []);

  const closeRun = useCallback((runId: string | null, beacon = false) => {
    if (!runId) return;
    const body = JSON.stringify({ runId });
    if (beacon && navigator.sendBeacon) navigator.sendBeacon("/api/observations/close", body);
    else void fetch("/api/observations/close", { method: "POST", headers: { "content-type": "application/json" }, body }).catch(() => {});
  }, []);

  // Al salir de la página se cierra la observación abierta (lo no elegido cuenta como recompensa 0).
  useEffect(() => {
    const onHide = () => closeRun(openRun.current, true);
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [closeRun]);

  // Recomendación principal: se recalcula al cambiar el contexto simulado o después de una orden.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setRecError(null);
    const previous = openRun.current;
    openRun.current = null;
    closeRun(previous);
    post<Recommendation>("/api/recommendations", {
      brand: menu.brand.slug,
      context: { ...ctxState.context, cartProductIds: [] },
      sessionId: sessionRef.current,
      scenarioName: ctxState.scenarioName,
    })
      .then((r) => {
        if (cancelled) {
          closeRun(r.runId);
          return;
        }
        openRun.current = r.runId;
        sessionRef.current = r.sessionId;
        setRec(r);
      })
      .catch((e: Error) => !cancelled && setRecError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [menu.brand.slug, ctxState, refreshKey, closeRun]);

  // Venta complementaria: ranking con el carrito como contexto (vista previa, no registra impresiones).
  const cartProductIds = useMemo(() => [...new Set(cart.map((l) => l.productId))].sort(), [cart]);
  const cartSig = cartProductIds.join(",");
  useEffect(() => {
    if (!cartProductIds.length) {
      setComplements([]);
      return;
    }
    const wanted = new Set(cartProductIds.flatMap((id) => productsById.get(id)?.complementCategorySlugs ?? []));
    const t = setTimeout(() => {
      post<Recommendation>("/api/recommendations", {
        brand: menu.brand.slug,
        context: { ...ctxState.context, cartProductIds },
        persist: false,
      })
        .then((r) =>
          setComplements(
            r.items
              .map((i) => productsById.get(i.productId)!)
              .filter((p) => p && !cartProductIds.includes(p.id) && wanted.has(catSlugById.get(p.categoryId) ?? ""))
              .slice(0, 3)
              .map((p) => p.id),
          ),
        )
        .catch(() => setComplements([]));
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartSig, ctxState, menu.brand.slug]);

  const track = useCallback(
    (productId: string, eventType: InteractionEventType) => {
      const runId = openRun.current;
      if (!runId || !rec?.items.some((i) => i.productId === productId)) return;
      void post("/api/interactions", { runId, productId, eventType }).catch(() => {});
    },
    [rec],
  );

  const addToCart = useCallback(
    (product: Product, selections: Selections, quantity: number, unit: number, replaceKey?: string) => {
      const line: CartLine = { key: lineKey(product.id, selections), productId: product.id, name: product.name, quantity, selections, unitPrice: unit };
      if (replaceKey) dispatch({ type: "replace", oldKey: replaceKey, line });
      else {
        dispatch({ type: "add", line });
        track(product.id, "add_to_cart");
      }
    },
    [track],
  );

  const removeLine = useCallback(
    (key: string) => {
      const line = cart.find((l) => l.key === key);
      dispatch({ type: "remove", key });
      if (line && !cart.some((l) => l.key !== key && l.productId === line.productId)) track(line.productId, "remove_from_cart");
    },
    [cart, track],
  );

  const checkout = useCallback(async (): Promise<OrderResult> => {
    const r = await post<OrderResult>("/api/orders", {
      brand: menu.brand.slug,
      runId: openRun.current,
      sessionId: sessionRef.current,
      context: { ...ctxState.context, cartProductIds: [] },
      items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity, selections: l.selections })),
    });
    dispatch({ type: "clear" });
    return r;
  }, [cart, ctxState.context, menu.brand.slug]);

  const sendFeedback = useCallback(async (orderId: string, rating: number | null) => {
    const r = await post<{ learned: { updated: number } | null }>("/api/orders/feedback", { orderId, rating });
    openRun.current = null; // la observación quedó cerrada en el servidor
    setRefreshKey((k) => k + 1); // nueva recomendación con el modelo actualizado
    return r;
  }, []);

  const setScenario = useCallback((scenarioId: string) => {
    const s = SCENARIOS.find((x) => x.id === scenarioId);
    if (!s) return;
    storeContext({ ...s.context, cartProductIds: [] }, s.name);
  }, []);

  // Elegibilidad para la vista (misma regla que el servidor).
  const unavailable = useMemo(() => {
    const m = new Map<string, IneligibleReason>();
    for (const p of menu.products) {
      const r = ineligibleReason(p, ctxState.context);
      if (r) m.set(p.id, r);
    }
    return m;
  }, [menu.products, ctxState.context]);

  const recommended = useMemo(
    () => (rec ? rec.items.slice(0, rec.topK).map((i) => ({ item: i, product: productsById.get(i.productId)! })).filter((x) => x.product) : []),
    [rec, productsById],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("es-MX").normalize("NFD").replace(/\p{Diacritic}/gu, "");
    const norm = (s: string) => s.toLocaleLowerCase("es-MX").normalize("NFD").replace(/\p{Diacritic}/gu, "");
    return menu.products.filter((p) => {
      if (category !== "all" && p.categoryId !== category) return false;
      if (onlyAvailable && unavailable.has(p.id)) return false;
      if (!q) return true;
      const optionText = p.modifiers.flatMap((g) => g.options.map((o) => o.label)).join(" ");
      return norm(`${p.name} ${p.description} ${optionText}`).includes(q);
    });
  }, [menu.products, query, category, onlyAvailable, unavailable]);

  return {
    menu,
    context: ctxState.context,
    scenarioName: ctxState.scenarioName,
    setScenario,
    rec,
    recError,
    loading,
    recommended,
    complements: complements.map((id) => productsById.get(id)!).filter(Boolean),
    unavailable,
    filtered,
    query,
    setQuery,
    category,
    setCategory,
    onlyAvailable,
    setOnlyAvailable,
    cart,
    totals: cartTotals(cart),
    addToCart,
    setQty: (key: string, quantity: number) => dispatch({ type: "qty", key, quantity }),
    removeLine,
    track,
    checkout,
    sendFeedback,
    productsById,
  };
}

export type Storefront = ReturnType<typeof useStorefront>;

export const UNAVAILABLE_TEXT: Record<IneligibleReason, string> = {
  inactivo: "No disponible",
  agotado: "Agotado",
  sin_stock: "Agotado",
  fuera_de_horario: "Fuera de horario",
  sin_precio: "Precio pendiente",
};
