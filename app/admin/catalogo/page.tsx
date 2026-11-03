"use client";
import { useState } from "react";
import { money } from "@/lib/cart";
import { BrandPicker, ErrorNote, api, useAdminBrand } from "@/components/admin/shared";
import { useBrandMenu } from "@/components/admin/useBrandMenu";

const DP: Record<string, string> = { morning: "mañana", afternoon: "tarde", evening: "noche" };

export default function CatalogPage() {
  const [brand, setBrand] = useAdminBrand();
  const { menu, reload, error: loadError } = useBrandMenu(brand);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function patch(id: string, body: { isAvailable?: boolean; stockDemo?: number | null }) {
    setBusyId(id);
    setError(null);
    try {
      await api(`/api/products/${id}/availability`, { method: "PATCH", body });
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  const cats = new Map(menu?.categories.map((c) => [c.id, c.name]) ?? []);
  return (
    <>
      <h1>Catálogo e inventario demo</h1>
      <p className="mpa-lede">
        Marca productos como agotados o ajusta el stock de demostración. Un producto agotado o con stock 0 deja de ser elegible y la IA no puede
        recomendarlo. Precios, tiempos de preparación y stock son datos demo, no oficiales.
      </p>
      <div className="mpa-toolbar">
        <BrandPicker brand={brand} onChange={setBrand} />
      </div>
      <ErrorNote error={error ?? loadError} />
      <section className="mpa-panel mpa-scroll">
        {!menu ? (
          <p className="mpa-empty">Cargando…</p>
        ) : (
          <table className="mpa-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th className="num">Precio demo</th>
                <th className="num">Prep. demo</th>
                <th>Horario</th>
                <th>Disponible</th>
                <th className="num">Stock demo</th>
              </tr>
            </thead>
            <tbody>
              {menu.products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                    <br />
                    <span className="mpa-muted">{p.tags.join(", ")}</span>
                  </td>
                  <td>{cats.get(p.categoryId)}</td>
                  <td className="num">{p.price == null ? "pendiente" : money.format(p.price)}</td>
                  <td className="num">{p.prepTimeSeconds == null ? "—" : `${Math.round(p.prepTimeSeconds / 6) / 10} min`}</td>
                  <td>{p.dayparts.map((d) => DP[d]).join(", ")}</td>
                  <td>
                    <label style={{ display: "inline-flex", gap: ".4rem", alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={p.isAvailable}
                        disabled={busyId === p.id}
                        onChange={(e) => patch(p.id, { isAvailable: e.target.checked })}
                      />
                      {p.isAvailable ? "Sí" : "Agotado"}
                    </label>
                  </td>
                  <td className="num">
                    <input
                      type="number"
                      min={0}
                      max={9999}
                      aria-label={`Stock demo de ${p.name}`}
                      defaultValue={p.stockDemo ?? ""}
                      key={`${p.id}-${p.stockDemo}`}
                      style={{ width: "5.5rem" }}
                      disabled={busyId === p.id}
                      onBlur={(e) => {
                        const v = e.target.value === "" ? null : Math.max(0, Math.floor(Number(e.target.value)));
                        if (v !== p.stockDemo) patch(p.id, { stockDemo: v });
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
