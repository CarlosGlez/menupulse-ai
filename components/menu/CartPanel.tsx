"use client";
import { useState } from "react";
import { describeSelections, money, type CartLine } from "@/lib/cart";
import type { OrderResult, Storefront } from "@/lib/client/useStorefront";
import type { Product } from "@/lib/types";

type Stage = { kind: "cart" } | { kind: "placed"; order: OrderResult } | { kind: "done"; order: OrderResult; updated: number | null; rating: number | null };

export function CartPanel({
  sf,
  title,
  emptyText,
  onEdit,
  onOpenProduct,
}: {
  sf: Storefront;
  title: string;
  emptyText: string;
  onEdit: (line: CartLine) => void;
  onOpenProduct: (p: Product) => void;
}) {
  const [stage, setStage] = useState<Stage>({ kind: "cart" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function placeOrder() {
    setBusy(true);
    setError(null);
    try {
      setStage({ kind: "placed", order: await sf.checkout() });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function rate(order: OrderResult, rating: number | null) {
    setBusy(true);
    setError(null);
    try {
      const r = await sf.sendFeedback(order.orderId, rating);
      setStage({ kind: "done", order, updated: r.learned?.updated ?? null, rating });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (stage.kind === "placed") {
    const o = stage.order;
    return (
      <section className="mp-cart" aria-live="polite">
        <h2>Orden simulada confirmada</h2>
        <p className="mp-order-number">{o.orderNumber}</p>
        <p>
          {o.items} {o.items === 1 ? "producto" : "productos"} · {money.format(o.total)}
        </p>
        <p className="mp-demo-note">Es una demostración: no se cobra ni se prepara nada.</p>
        <fieldset className="mp-rating">
          <legend>¿Qué tan buena fue la recomendación?</legend>
          <div className="mp-rating-row">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" disabled={busy} onClick={() => rate(o, n)} aria-label={`${n} de 5`}>
                {n}
              </button>
            ))}
          </div>
        </fieldset>
        <button type="button" className="mp-link" disabled={busy} onClick={() => rate(o, null)}>
          Omitir calificación
        </button>
        {error && <p className="mp-errors" role="alert">{error}</p>}
      </section>
    );
  }

  if (stage.kind === "done") {
    return (
      <section className="mp-cart" aria-live="polite">
        <h2>Gracias</h2>
        <p>
          {stage.updated
            ? `El modelo aprendió de esta visita: actualizó ${stage.updated} ${stage.updated === 1 ? "producto" : "productos"} con las recompensas observadas.`
            : "La orden quedó registrada. Esta visita no generó aprendizaje nuevo (la recomendación ya estaba cerrada o era el menú fijo)."}
        </p>
        <button type="button" className="mp-primary" onClick={() => setStage({ kind: "cart" })}>
          Hacer otra orden
        </button>
      </section>
    );
  }

  return (
    <section className="mp-cart" aria-labelledby="mp-cart-title">
      <h2 id="mp-cart-title">
        {title} {sf.totals.items > 0 && <span className="mp-count">(<span key={sf.totals.items} className="mp-bump">{sf.totals.items}</span>)</span>}
      </h2>
      {sf.cart.length === 0 ? (
        <p className="mp-empty">{emptyText}</p>
      ) : (
        <>
          <ul className="mp-lines">
            {sf.cart.map((l) => {
              const p = sf.productsById.get(l.productId);
              const desc = p ? describeSelections(p, l.selections) : "";
              return (
                <li key={l.key} className="mp-line">
                  <div className="mp-line-main">
                    <span className="mp-line-name">{l.name}</span>
                    {desc && <span className="mp-line-desc">{desc}</span>}
                    <span className="mp-line-price">{money.format(l.unitPrice * l.quantity)}</span>
                  </div>
                  <div className="mp-line-actions">
                    <div className="mp-qty" role="group" aria-label={`Cantidad de ${l.name}`}>
                      <button type="button" onClick={() => sf.setQty(l.key, l.quantity - 1)} disabled={l.quantity <= 1} aria-label="Quitar uno">
                        −
                      </button>
                      <output>{l.quantity}</output>
                      <button type="button" onClick={() => sf.setQty(l.key, l.quantity + 1)} disabled={l.quantity >= 20} aria-label="Agregar uno">
                        +
                      </button>
                    </div>
                    {p && p.modifiers.length > 0 && (
                      <button type="button" className="mp-link" onClick={() => onEdit(l)}>
                        Editar
                      </button>
                    )}
                    <button type="button" className="mp-link" onClick={() => sf.removeLine(l.key)}>
                      Quitar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {sf.complements.length > 0 && (
            <div className="mp-complements">
              <h3>Para acompañar</h3>
              <ul>
                {sf.complements.map((p) => (
                  <li key={p.id}>
                    <button type="button" className="mp-link" onClick={() => onOpenProduct(p)}>
                      {p.name} · {money.format(p.price ?? 0)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <dl className="mp-totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{money.format(sf.totals.subtotal)}</dd>
            </div>
            <div className="mp-total">
              <dt>Total</dt>
              <dd>{money.format(sf.totals.total)}</dd>
            </div>
          </dl>
          <button type="button" className="mp-primary mp-checkout" onClick={placeOrder} disabled={busy}>
            {busy ? "Enviando…" : "Confirmar orden simulada"}
          </button>
          {error && <p className="mp-errors" role="alert">{error}</p>}
        </>
      )}
    </section>
  );
}
