import Link from "next/link";
import "@fontsource/anton/400.css";
import "@fontsource/archivo-black/400.css";
import s from "./home.module.css";

const PANELS = [
  { slug: "dominos", name: "Domino's Pizza", line: "Pizzas, entradas y alitas", className: s.dominos },
  { slug: "carls-jr", name: "Carl's Jr.", line: "Burgers, combos y malteadas", className: s.carls },
  { slug: "degas-cafe", name: "Degas Café", line: "Café, frappés, paninis y repostería", className: s.degas },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ kiosco?: string }> }) {
  const kiosk = (await searchParams).kiosco === "1";
  return (
    <div className={s.page}>
      <header className={s.intro}>
        <p className={s.product}>MenuPulse AI</p>
        <h1>Tres menús que cambian según el clima, la hora y la fila.</h1>
        <p className={s.lede}>
          Cada menú destaca productos distintos según condiciones simuladas y aprende de lo que eligen las personas, con un modelo
          LinUCB que puedes inspeccionar. Proyecto académico, no afiliado a las marcas; precios y datos de demostración.
        </p>
      </header>
      <nav aria-label="Elegir menú" className={s.triptych}>
        {PANELS.map((p) => (
          <Link key={p.slug} href={`/menu/${p.slug}${kiosk ? "?kiosco=1" : ""}`} className={`${s.panel} ${p.className}`}>
            <span className={s.name}>{p.name}</span>
            <span className={s.line}>{p.line}</span>
            <span className={s.enter}>Ver menú</span>
          </Link>
        ))}
      </nav>
      {!kiosk && (
        <footer className={s.footer}>
          <p>En cada menú puedes cambiar el escenario simulado (día caluroso, lluvia, hora pico…) y ver por qué se recomienda cada producto.</p>
          <p className={s.links}>
            <Link href="/admin">Panel de simulación y entrenamiento</Link>
            <Link href="/?kiosco=1">Modo kiosco</Link>
          </p>
        </footer>
      )}
    </div>
  );
}
