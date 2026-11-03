"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { money } from "@/lib/cart";
import { UNAVAILABLE_TEXT, useStorefront } from "@/lib/client/useStorefront";
import type { MenuData, Product } from "@/lib/types";
import { CartPanel } from "@/components/menu/CartPanel";
import { ContextBar } from "@/components/menu/ContextBar";
import { Drawer } from "@/components/menu/Drawer";
import { ProductArt, artKind } from "@/components/menu/ProductArt";
import { ProductDialog, type DialogTarget } from "@/components/menu/ProductDialog";
import { DemoFooter, ModelStamp, WhyThis } from "@/components/menu/WhyThis";
import "@fontsource/anton/400.css";
import s from "./carls.module.css";

function useWide(query: string) {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setWide(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return wide;
}

export function CarlsMenu({ menu }: { menu: MenuData }) {
  const sf = useStorefront(menu);
  const [target, setTarget] = useState<DialogTarget | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const wide = useWide("(min-width: 1100px)");
  const cat = new Map(menu.categories.map((c) => [c.id, c.slug]));
  const art = (p: Product, cls?: string) => <ProductArt kind={artKind(p, cat.get(p.categoryId) ?? "")} className={cls} />;
  const open = (p: Product) => {
    sf.track(p.id, "click");
    setTarget({ product: p });
  };
  const grouped = menu.categories.map((c) => ({ c, items: sf.filtered.filter((p) => p.categoryId === c.id) })).filter((g) => g.items.length);

  const cartPanel = (
    <CartPanel
      sf={sf}
      title="Tu orden"
      emptyText="Aún no hay nada. Elige una burger o un combo."
      onEdit={(l) => setTarget({ product: sf.productsById.get(l.productId)!, selections: l.selections, quantity: l.quantity, editKey: l.key })}
      onOpenProduct={open}
    />
  );

  return (
    <div className={`mp-root ${s.root}`}>
      <header className={s.header}>
        <Link href="/" className={s.wordmark}>
          Carl&apos;s Jr.
        </Link>
        <span className={s.demo}>Menú demo · no oficial</span>
        {!wide && (
          <button type="button" className={s.orderButton} onClick={() => setCartOpen(true)}>
            Tu orden ({sf.totals.items}) · {money.format(sf.totals.total)}
          </button>
        )}
      </header>

      <div className={s.layout}>
        <nav className={s.side} aria-label="Categorías">
          <label className={s.search}>
            <span className="sr-only">Buscar por nombre o ingrediente</span>
            <input type="search" placeholder="Buscar burger, tocino…" value={sf.query} onChange={(e) => sf.setQuery(e.target.value)} />
          </label>
          <ul className={s.catList}>
            <li>
              <button type="button" aria-pressed={sf.category === "all"} onClick={() => sf.setCategory("all")}>
                Todo el menú
              </button>
            </li>
            {menu.categories.map((c) => (
              <li key={c.id}>
                <button type="button" aria-pressed={sf.category === c.id} onClick={() => sf.setCategory(c.id)}>
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
          <label className={s.toggle}>
            <input type="checkbox" checked={sf.onlyAvailable} onChange={(e) => sf.setOnlyAvailable(e.target.checked)} />
            Solo disponibles ahora
          </label>
        </nav>

        <main className={s.main}>
          <section className={s.board} aria-labelledby="cj-rec">
            <div className={s.boardHead}>
              <h1 id="cj-rec">Para este momento</h1>
              <ContextBar sf={sf} />
            </div>
            {sf.recError && <p role="alert">No se pudo calcular la recomendación: {sf.recError}. El menú completo sigue disponible.</p>}
            <ol className={s.boardList} aria-busy={sf.loading} aria-label="Ranking recomendado">
              {sf.recommended.map(({ item, product: p }) => (
                <li key={p.id} className={s.boardRow}>
                  <span className={s.rank} aria-label={`Posición ${item.position}`}>
                    {item.position}
                  </span>
                  <button type="button" className={s.boardArt} onClick={() => open(p)} aria-label={`Ver ${p.name}`}>
                    {art(p)}
                  </button>
                  <div className={s.boardText}>
                    <h2 className={s.boardName}>{p.name}</h2>
                    <WhyThis item={item} />
                  </div>
                  <button type="button" className={s.priceBlock} onClick={() => open(p)}>
                    {money.format(p.price ?? 0)}
                    <span>Ordenar</span>
                  </button>
                </li>
              ))}
            </ol>
            {sf.rec && <ModelStamp rec={sf.rec} />}
          </section>

          {grouped.length === 0 && <p className={s.empty}>Nada coincide con “{sf.query}”. Prueba otra palabra o quita los filtros.</p>}
          {grouped.map(({ c, items }) => (
            <section key={c.id} className={s.section} aria-labelledby={`cj-${c.slug}`}>
              <h2 id={`cj-${c.slug}`} className={s.sectionTitle}>
                {c.name}
              </h2>
              <ul className={s.grid}>
                {items.map((p) => {
                  const na = sf.unavailable.get(p.id);
                  return (
                    <li key={p.id} className={s.card} data-unavailable={na ? true : undefined}>
                      <button type="button" className={s.cardButton} onClick={() => open(p)}>
                        <span className={s.cardArt}>{art(p)}</span>
                        <span className={s.cardName}>{p.name}</span>
                        <span className={s.cardDesc}>{p.description}</span>
                        <span className={s.cardFoot}>
                          <span className={s.cardPrice}>{money.format(p.price ?? 0)}</span>
                          {na && <span className={s.off}>{UNAVAILABLE_TEXT[na]}</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          <DemoFooter brandName="Carl's Jr." />
        </main>

        {wide && <aside className={s.orderColumn}>{cartPanel}</aside>}
      </div>

      {!wide && (
        <Drawer open={cartOpen} onClose={() => setCartOpen(false)} label="Tu orden" className={s.drawer}>
          {cartPanel}
        </Drawer>
      )}

      <ProductDialog
        target={target}
        art={target ? art(target.product) : null}
        unavailableText={target && sf.unavailable.get(target.product.id) ? UNAVAILABLE_TEXT[sf.unavailable.get(target.product.id)!] : null}
        onClose={() => setTarget(null)}
        onConfirm={sf.addToCart}
      />
    </div>
  );
}
