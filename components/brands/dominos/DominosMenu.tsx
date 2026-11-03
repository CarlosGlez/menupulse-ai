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
import "@fontsource/archivo-black/400.css";
import s from "./dominos.module.css";

export function DominosMenu({ menu }: { menu: MenuData }) {
  const sf = useStorefront(menu);
  const [target, setTarget] = useState<DialogTarget | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const cat = new Map(menu.categories.map((c) => [c.id, c.slug]));
  const art = (p: Product, cls?: string) => <ProductArt kind={artKind(p, cat.get(p.categoryId) ?? "")} className={cls} />;

  const open = (p: Product) => {
    sf.track(p.id, "click");
    setTarget({ product: p });
  };

  const grouped = menu.categories
    .map((c) => ({ c, items: sf.filtered.filter((p) => p.categoryId === c.id) }))
    .filter((g) => g.items.length);

  // Al cambiar el ranking se re-monta la lista y la entrada animada muestra que el menú se reacomodó.
  const recKey = sf.recommended.map((r) => r.product.id).join("|");

  return (
    <div className={`mp-root ${s.root}`}>
      <header className={s.header}>
        <Link href="/" className={s.wordmark}>
          Domino&apos;s Pizza<span className={s.demoTag}>demo</span>
        </Link>
        <button type="button" className={s.cartButton} onClick={() => setCartOpen(true)}>
          Tu orden <span key={sf.totals.items} className={`${s.cartCount} mp-bump`}>{sf.totals.items}</span>
          <span className={s.cartTotal}>{money.format(sf.totals.total)}</span>
        </button>
      </header>

      <section className={s.hero} aria-labelledby="dom-rec">
        <div className={s.heroHead}>
          <h1 id="dom-rec">Recomendado para este momento</h1>
          <ContextBar sf={sf} />
        </div>
        {sf.recError && <p role="alert">No se pudo calcular la recomendación: {sf.recError}. El menú completo sigue disponible abajo.</p>}
        <ol key={recKey} className={s.recRow} aria-busy={sf.loading}>
          {sf.recommended.map(({ item, product: p }, i) => (
            <li key={p.id} className={s.recCard} style={{ "--i": i } as React.CSSProperties}>
              <button type="button" className={s.recOpen} onClick={() => open(p)} aria-label={`Ver ${p.name}`}>
                {art(p, s.recArt)}
              </button>
              <div className={s.recBody}>
                <h2 className={s.recName}>{p.name}</h2>
                <p className={s.recPrice}>
                  desde <strong>{money.format(p.price ?? 0)}</strong>
                </p>
                <button type="button" className="mp-primary" onClick={() => open(p)}>
                  Personalizar
                </button>
                <WhyThis item={item} />
              </div>
            </li>
          ))}
        </ol>
        {sf.rec && <ModelStamp rec={sf.rec} />}
      </section>

      <nav className={s.toolbar} aria-label="Categorías y búsqueda">
        <div className={s.tabs} role="tablist" aria-label="Categorías">
          <button type="button" role="tab" aria-selected={sf.category === "all"} onClick={() => sf.setCategory("all")}>
            Todo el menú
          </button>
          {menu.categories.map((c) => (
            <button key={c.id} type="button" role="tab" aria-selected={sf.category === c.id} onClick={() => sf.setCategory(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
        <div className={s.searchRow}>
          <label className={s.search}>
            <span className="sr-only">Buscar por nombre o ingrediente</span>
            <input type="search" placeholder="Buscar pizza, ingrediente…" value={sf.query} onChange={(e) => sf.setQuery(e.target.value)} />
          </label>
          <label className={s.toggle}>
            <input type="checkbox" checked={sf.onlyAvailable} onChange={(e) => sf.setOnlyAvailable(e.target.checked)} />
            Solo disponibles ahora
          </label>
        </div>
      </nav>

      <main className={s.main}>
        {grouped.length === 0 && <p className={s.empty}>No encontramos productos con “{sf.query}”. Prueba con otro ingrediente o quita los filtros.</p>}
        {grouped.map(({ c, items }) => (
          <section key={c.id} className={s.section} aria-labelledby={`dom-${c.slug}`}>
            <h2 id={`dom-${c.slug}`} className={s.sectionTitle}>
              {c.name}
            </h2>
            <ul className={s.grid}>
              {items.map((p) => {
                const na = sf.unavailable.get(p.id);
                return (
                  <li key={p.id} className={s.card} data-unavailable={na ? true : undefined}>
                    <button type="button" className={s.cardButton} onClick={() => open(p)}>
                      {art(p, s.cardArt)}
                      <span className={s.cardName}>{p.name}</span>
                      <span className={s.cardDesc}>{p.description}</span>
                      <span className={s.cardFoot}>
                        <span className={s.cardPrice}>{money.format(p.price ?? 0)}</span>
                        {na ? <span className={s.badgeOff}>{UNAVAILABLE_TEXT[na]}</span> : p.modifiers.length > 0 && <span className={s.badge}>Personalizable</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </main>

      <button type="button" className={s.floatingCart} onClick={() => setCartOpen(true)}>
        Ver orden · <span key={sf.totals.items} className="mp-bump">{sf.totals.items}</span> · {money.format(sf.totals.total)}
      </button>

      <Drawer open={cartOpen} onClose={() => setCartOpen(false)} label="Tu orden" className={s.drawer}>
        <CartPanel
          sf={sf}
          title="Tu orden"
          emptyText="Tu orden está vacía. Elige una pizza para empezar."
          onEdit={(l) => setTarget({ product: sf.productsById.get(l.productId)!, selections: l.selections, quantity: l.quantity, editKey: l.key })}
          onOpenProduct={open}
        />
      </Drawer>

      <ProductDialog
        target={target}
        art={target ? art(target.product) : null}
        unavailableText={target ? (sf.unavailable.get(target.product.id) ? UNAVAILABLE_TEXT[sf.unavailable.get(target.product.id)!] : null) : null}
        onClose={() => setTarget(null)}
        onConfirm={sf.addToCart}
      />
      <DemoFooter brandName="Domino's Pizza" />
    </div>
  );
}
