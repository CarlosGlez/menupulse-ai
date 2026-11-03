import Link from "next/link";
import "@fontsource/anton/400.css";
import "@fontsource/archivo-black/400.css";
import { ProductArt } from "@/components/menu/ProductArt";
import s from "./home.module.css";

const PANELS = [
  { slug: "dominos", name: "Domino's Pizza", line: "Pizzas, entradas y alitas", className: s.dominos, art: "pizza" as const },
  { slug: "carls-jr", name: "Carl's Jr.", line: "Burgers, combos y malteadas", className: s.carls, art: "burger" as const },
  { slug: "degas-cafe", name: "Degas Café", line: "Café, frappés, paninis y repostería", className: s.degas, art: "hot" as const },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ kiosco?: string }> }) {
  const kiosk = (await searchParams).kiosco === "1";
  return (
    <div className={s.page}>
      <header className={s.intro}>
        <p className={s.product}>
          <span className={s.pulse} aria-hidden="true" />
          MenuPulse AI
        </p>
        <h1>Tres menús que cambian según el clima, la hora y la fila.</h1>
        <p className={s.lede}>
          Cada menú destaca productos distintos según condiciones simuladas y aprende de lo que eligen las personas, con un modelo
          LinUCB que puedes inspeccionar. Proyecto académico, no afiliado a las marcas; precios y datos de demostración.
        </p>
      </header>
      <nav aria-label="Elegir menú" className={s.triptych}>
        {PANELS.map((p, i) => (
          <Link
            key={p.slug}
            href={`/menu/${p.slug}${kiosk ? "?kiosco=1" : ""}`}
            className={`${s.panel} ${p.className}`}
            style={{ "--i": i } as React.CSSProperties}
          >
            <ProductArt kind={p.art} className={s.art} />
            <span className={s.name}>{p.name}</span>
            <span className={s.line}>{p.line}</span>
            <span className={s.enter}>Ver menú</span>
          </Link>
        ))}
      </nav>
      {!kiosk && (
        <footer className={s.footer}>
          <p>En cada menú puedes cambiar el escenario simulado (día caluroso, lluvia, hora pico…) y ver por qué se recomienda cada producto.</p>
          <div className={s.links}>
            <Link href="/admin" className={s.adminCta}>
              <span className={s.ctaIcon} aria-hidden="true">
                <svg viewBox="0 0 20 20">
                  <path d="M3 16l4-5 3 3 7-9M13 5h4v4" />
                </svg>
              </span>
              <span className={s.ctaText}>
                <strong>Panel de simulación y entrenamiento</strong>
                <span>Entrena el modelo, aplica escenarios y compara el menú fijo contra la IA</span>
              </span>
            </Link>
            <Link href="/?kiosco=1" className={s.kioskCta}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M3 4h14v10H3zM7 17h6M10 14v3" />
              </svg>
              Modo kiosco
            </Link>
          </div>
        </footer>
      )}
    </div>
  );
}
