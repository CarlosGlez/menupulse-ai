"use client";
import { useEffect, useRef, useState } from "react";
import { activeGroups, defaultSelections, money, normalizeSelections, unitPrice, validateSelections, type Selections } from "@/lib/cart";
import type { Product } from "@/lib/types";

export interface DialogTarget {
  product: Product;
  selections?: Selections;
  quantity?: number;
  editKey?: string;
}

export function ProductDialog({
  target,
  art,
  unavailableText,
  onClose,
  onConfirm,
}: {
  target: DialogTarget | null;
  art?: React.ReactNode;
  unavailableText?: string | null;
  onClose: () => void;
  onConfirm: (product: Product, selections: Selections, quantity: number, unit: number, editKey?: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [sel, setSel] = useState<Selections>({});
  const [qty, setQty] = useState(1);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (target) {
      setSel(target.selections ?? defaultSelections(target.product));
      setQty(target.quantity ?? 1);
      setShowErrors(false);
      if (!d.open) d.showModal();
    } else if (d.open) d.close();
  }, [target]);

  const p = target?.product;
  const groups = p ? activeGroups(p, sel) : [];
  const errors = p ? validateSelections(p, normalizeSelections(p, sel)) : [];
  const unit = p && p.price !== null ? unitPrice(p, normalizeSelections(p, sel)) : 0;

  function toggle(groupId: string, optionId: string, single: boolean, max?: number) {
    setSel((s) => {
      const cur = s[groupId] ?? [];
      if (single) return { ...s, [groupId]: [optionId] };
      if (cur.includes(optionId)) return { ...s, [groupId]: cur.filter((x) => x !== optionId) };
      if (max !== undefined && cur.length >= max) return s;
      return { ...s, [groupId]: [...cur, optionId] };
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!p) return;
    if (errors.length) {
      setShowErrors(true);
      return;
    }
    onConfirm(p, normalizeSelections(p, sel), qty, unit, target?.editKey);
    onClose();
  }

  return (
    <dialog ref={ref} className="mp-dialog" onClose={onClose} aria-labelledby="mp-dialog-title">
      {p && (
        <form onSubmit={submit} className="mp-dialog-body">
          <div className="mp-dialog-art">{art}</div>
          <div className="mp-dialog-content">
            <button type="button" className="mp-dialog-close" onClick={onClose} aria-label="Cerrar">
              ×
            </button>
            <h2 id="mp-dialog-title">{p.name}</h2>
            <p className="mp-dialog-desc">{p.description}</p>
            <p className="mp-demo-note">Precio de demostración, no oficial.</p>

            {groups.map((g) => (
              <fieldset key={g.id} className="mp-group">
                <legend>
                  {g.label}
                  {g.type === "multi" && g.max ? <span className="mp-group-hint"> (hasta {g.max})</span> : null}
                </legend>
                <div className="mp-options">
                  {g.options.map((o) => {
                    const checked = (sel[g.id] ?? []).includes(o.id);
                    return (
                      <label key={o.id} className="mp-option" data-checked={checked || undefined}>
                        <input
                          type={g.type === "single" ? "radio" : "checkbox"}
                          name={`${p.id}-${g.id}`}
                          checked={checked}
                          onChange={() => toggle(g.id, o.id, g.type === "single", g.max)}
                        />
                        <span>{o.label}</span>
                        {o.priceDelta !== 0 && (
                          <span className="mp-option-delta">
                            {o.priceDelta > 0 ? "+" : "−"}
                            {money.format(Math.abs(o.priceDelta))}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}

            {showErrors && errors.length > 0 && (
              <ul className="mp-errors" role="alert">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}

            <div className="mp-dialog-actions">
              <div className="mp-qty" role="group" aria-label="Cantidad">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Quitar uno">
                  −
                </button>
                <output aria-live="polite">{qty}</output>
                <button type="button" onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="Agregar uno">
                  +
                </button>
              </div>
              <button type="submit" className="mp-primary" disabled={Boolean(unavailableText) || p.price === null}>
                {unavailableText ? unavailableText : `${target?.editKey ? "Guardar cambios" : "Agregar"} · ${money.format(unit * qty)}`}
              </button>
            </div>
          </div>
        </form>
      )}
    </dialog>
  );
}
