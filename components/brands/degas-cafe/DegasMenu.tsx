"use client";
import Link from "next/link";
import { useState } from "react";
import { money } from "@/lib/cart";
import { UNAVAILABLE_TEXT, useStorefront } from "@/lib/client/useStorefront";
import type { MenuData, Product } from "@/lib/types";
import { CartPanel } from "@/components/menu/CartPanel";
import { ContextBar } from "@/components/menu/ContextBar";
import { Drawer } from "@/components/menu/Drawer";
import { ProductArt, artKind } from "@/components/menu/ProductArt";
import { ProductDialog, type DialogTarget } from "@/components/menu/ProductDialog";
import { DemoFooter, ModelStamp, WhyThis } from "@/components/menu/WhyThis";
import s from "./degas.module.css";

export function DegasMenu({ menu }: { menu: MenuData }) {
  const sf = useStorefront(menu);
  const [target, setTarget] = useState<DialogTarget | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const cat = new Map(menu.categories.map((c) => [c.id, c.slug]));
  const art = (p: Product, cls?: string) => <ProductArt kind={artKind(p, cat.get(p.categoryId) ?? "")} className={cls} />;
  const open = (p: Product) => {
    sf.track(p.id, "click");
    setTarget({ product: p });
  };
  const grouped = menu.categories.map((c) => ({ c, items: sf.filtered.filter((p) => p.categoryId === c.id) })).filter((g) => g.items.length);

  const recKey = sf.recommended.map((r) => r.product.id).join("|");

  return (
    <div className={`mp-root ${s.root}`}>
      <header className={s.header}>
        <div className={s.headInner}>
          <Link href="/" className={s.wordmark}>
            Degas Café
          </Link>
          <p className={s.tagline}>Carta de demostración</p>
          <button type="button" className={s.bag} onClick={() => setCartOpen(true)}>
            Tu pedido
            <span>
              <span key={sf.totals.items} className="mp-bump">{sf.totals.items}</span> · {money.format(sf.totals.total)}
            </span>
          </button>
        </div>
      </header>

      <section className={s.today} aria-labelledby="dg-today">
        <div className={s.todayInner}>
          <div className={s.todayHead}>
            <h1 id="dg-today">Hoy sugerimos</h1>
            <ContextBar sf={sf} />
          </div>
          {sf.recError && <p role="alert">No se pudo calcular la sugerencia: {sf.recError}. La carta completa sigue abajo.</p>}
          <ul key={recKey} className={s.todayList} aria-busy={sf.loading}>
            {sf.recommended.map(({ item, product: p }, i) => (
              <li key={p.id} className={s.todayItem} style={{ "--i": i } as React.CSSProperties}>
                <button type="button" className={s.todayArt} onClick={() => open(p)} aria-label={`Ver ${p.name}`}>
                  {art(p)}
                </button>
                <div>
                  <button type="button" className={s.todayName} onClick={() => open(p)}>
                    {p.name}
                  </button>
                  <p className={s.todayPrice}>{money.format(p.price ?? 0)}</p>
                  <WhyThis item={item} />
                </div>
              </li>
            ))}
          </ul>
          {sf.rec && <ModelStamp rec={sf.rec} />}
        </div>
      </section>

      <div className={s.filters}>
        <label className={s.search}>
          <span className="sr-only">Buscar por nombre o ingrediente</span>
          <input type="search" placeholder="Buscar en la carta: chai, cajeta, almendra…" value={sf.query} onChange={(e) => sf.setQuery(e.target.value)} />
        </label>
        <label className={s.select}>
          <span>Sección</span>
          <select value={sf.category} onChange={(e) => sf.setCategory(e.target.value)}>
            <option value="all">Toda la carta</option>
            {menu.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className={s.toggle}>
          <input type="checkbox" checked={sf.onlyAvailable} onChange={(e) => sf.setOnlyAvailable(e.target.checked)} />
          Solo lo disponible ahora
        </label>
      </div>

      <main className={s.carta}>
        {grouped.length === 0 && <p>No hay nada en la carta con “{sf.query}”. Prueba otra palabra.</p>}
        {grouped.map(({ c, items }) => (
          <section key={c.id} className={s.section} aria-labelledby={`dg-${c.slug}`}>
            <h2 id={`dg-${c.slug}`}>{c.name}</h2>
            <ul>
              {items.map((p) => {
                const na = sf.unavailable.get(p.id);
                return (
                  <li key={p.id} data-unavailable={na ? true : undefined}>
                    <button type="button" className={s.entry} onClick={() => open(p)}>
                      <span className={s.entryLine}>
                        <span className={s.entryName}>{p.name}</span>
                        <span className={s.leader} aria-hidden="true" />
                        <span className={s.entryPrice}>{money.format(p.price ?? 0)}</span>
                      </span>
                      <span className={s.entryDesc}>
                        {p.description}
                        {na && <em className={s.na}> — {UNAVAILABLE_TEXT[na].toLowerCase()}</em>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </main>

      <Drawer open={cartOpen} onClose={() => setCartOpen(false)} label="Tu pedido" className={s.drawer}>
        <CartPanel
          sf={sf}
          title="Tu pedido"
          emptyText="Tu pedido está vacío. Elige algo de la carta."
          onEdit={(l) => setTarget({ product: sf.productsById.get(l.productId)!, selections: l.selections, quantity: l.quantity, editKey: l.key })}
          onOpenProduct={open}
        />
      </Drawer>
      <button type="button" className={s.floating} onClick={() => setCartOpen(true)}>
        Tu pedido · <span key={sf.totals.items} className="mp-bump">{sf.totals.items}</span> · {money.format(sf.totals.total)}
      </button>

      <ProductDialog
        target={target}
        art={target ? art(target.product) : null}
        unavailableText={target && sf.unavailable.get(target.product.id) ? UNAVAILABLE_TEXT[sf.unavailable.get(target.product.id)!] : null}
        onClose={() => setTarget(null)}
        onConfirm={sf.addToCart}
      />
      <DemoFooter brandName="Degas Café" />
    </div>
  );
}
