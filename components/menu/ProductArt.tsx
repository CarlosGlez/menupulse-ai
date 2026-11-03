// Ilustraciones propias (SVG) como placeholder: no se usan fotos ni logotipos de las marcas.
// Los colores vienen de variables CSS de cada marca: --art-1 (principal), --art-2, --art-3, --art-bg.
import type { Product } from "@/lib/types";

type Kind = "pizza" | "wings" | "bread" | "fries" | "burger" | "chicken" | "soda" | "shake" | "hot" | "iced" | "frappe" | "croissant" | "panini" | "slice" | "muffin" | "bites";

export function artKind(p: Product, categorySlug: string): Kind {
  const s = p.slug;
  if (categorySlug === "especialidades" || categorySlug === "arma-tu-pizza") return "pizza";
  if (categorySlug === "alitas-boneless") return "wings";
  if (s.includes("baitz")) return "bites";
  if (s.includes("papotas") || s === "papas" || s.includes("aros")) return "fries";
  if (s.includes("cheesy")) return "bread";
  if (s.includes("estrellas")) return "chicken";
  if (s === "malteada") return "shake";
  if (s.startsWith("refresco")) return "soda";
  if (["big-angus", "burgers", "veggie", "combos"].includes(categorySlug)) return "burger";
  if (categorySlug === "frappes" || categorySlug === "smoothies") return "frappe";
  if (categorySlug === "cafe-frio") return "iced";
  if (categorySlug === "cafe-caliente" || categorySlug === "tes") return "hot";
  if (categorySlug === "croissants") return "croissant";
  if (categorySlug === "paninis") return "panini";
  if (s === "muffin" || s === "bisquet") return "muffin";
  if (p.tags.includes("dessert")) return "slice";
  return "bites";
}

export function ProductArt({ kind, className }: { kind: Kind; className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} style={{ background: "var(--art-bg)" }} aria-hidden="true" focusable="false">
      <rect width="120" height="120" fill="var(--art-bg)" />
      {SHAPES[kind]}
    </svg>
  );
}

const A = "var(--art-1)";
const B = "var(--art-2)";
const C = "var(--art-3)";

const SHAPES: Record<Kind, React.ReactNode> = {
  pizza: (
    <g>
      <circle cx="60" cy="60" r="46" fill={B} />
      <circle cx="60" cy="60" r="38" fill={A} />
      {[[45, 45], [72, 42], [60, 64], [40, 72], [78, 72], [58, 86]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="6.5" fill={C} />
      ))}
      <path d="M60 22 L60 98 M22 60 L98 60 M33 33 L87 87 M87 33 L33 87" stroke={B} strokeWidth="1.5" opacity=".55" />
    </g>
  ),
  wings: (
    <g>
      <ellipse cx="60" cy="88" rx="44" ry="10" fill={B} opacity=".5" />
      {[[40, 62, -20], [66, 56, 15], [54, 76, 5]].map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx="20" ry="12" transform={`rotate(${r} ${x} ${y})`} fill={A} />
      ))}
    </g>
  ),
  bread: (
    <g>
      <rect x="18" y="40" width="84" height="42" rx="10" fill={B} />
      <rect x="22" y="36" width="76" height="34" rx="9" fill={A} />
      {[34, 50, 66, 82].map((x) => (
        <line key={x} x1={x} y1="38" x2={x} y2="68" stroke={C} strokeWidth="3" />
      ))}
    </g>
  ),
  fries: (
    <g>
      {[36, 46, 56, 66, 76, 84].map((x, i) => (
        <rect key={x} x={x - 3} y={24 + (i % 3) * 6} width="7" height="50" rx="2" fill={C} />
      ))}
      <path d="M28 54 L92 54 L84 100 L36 100 Z" fill={A} />
    </g>
  ),
  burger: (
    <g>
      <path d="M22 56 Q60 10 98 56 Z" fill={C} />
      <rect x="20" y="58" width="80" height="8" rx="4" fill={B} />
      <rect x="18" y="66" width="84" height="12" rx="6" fill={A} />
      <rect x="22" y="80" width="76" height="16" rx="8" fill={C} />
    </g>
  ),
  chicken: (
    <g>
      {[[42, 50], [74, 48], [58, 76]].map(([x, y], i) => (
        <polygon key={i} transform={`translate(${x} ${y}) scale(.8)`} points="0,-20 6,-6 20,-6 9,3 13,18 0,9 -13,18 -9,3 -20,-6 -6,-6" fill={A} />
      ))}
    </g>
  ),
  soda: (
    <g>
      <rect x="57" y="12" width="4" height="30" fill={C} />
      <path d="M38 34 L82 34 L76 104 L44 104 Z" fill={A} />
      <rect x="40" y="56" width="40" height="16" fill={B} />
    </g>
  ),
  shake: (
    <g>
      <path d="M38 40 Q60 18 82 40 Z" fill={C} />
      <path d="M38 42 L82 42 L74 104 L46 104 Z" fill={A} />
      <circle cx="62" cy="24" r="6" fill={B} />
    </g>
  ),
  hot: (
    <g>
      <g className="mp-steam" stroke={B} strokeWidth="3" fill="none" strokeLinecap="round">
        <path d="M50 18 q6 8 0 16" />
        <path d="M62 14 q6 8 0 16" />
        <path d="M74 18 q6 8 0 16" />
      </g>
      <path d="M30 44 L90 44 L82 96 Q60 104 38 96 Z" fill={A} />
      <path d="M88 54 q16 4 0 24" stroke={A} strokeWidth="7" fill="none" />
      <ellipse cx="60" cy="46" rx="28" ry="5" fill={C} />
    </g>
  ),
  iced: (
    <g>
      <path d="M36 28 L84 28 L78 104 L42 104 Z" fill={A} opacity=".9" />
      {[[48, 46], [64, 52], [54, 64]].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="13" height="13" rx="2" fill={C} opacity=".85" transform={`rotate(${i * 17} ${x} ${y})`} />
      ))}
      <rect x="66" y="10" width="4" height="40" fill={B} transform="rotate(12 68 30)" />
    </g>
  ),
  frappe: (
    <g>
      <path d="M36 40 Q60 8 84 40 Z" fill={C} />
      <path d="M36 42 L84 42 L77 104 L43 104 Z" fill={A} />
      <path d="M40 60 L80 60" stroke={B} strokeWidth="5" />
      <rect x="62" y="8" width="4" height="34" fill={B} />
    </g>
  ),
  croissant: (
    <g>
      <path d="M18 74 Q60 20 102 74 Q90 84 80 78 Q70 90 60 82 Q50 90 40 78 Q30 84 18 74 Z" fill={A} />
      <path d="M40 78 Q46 56 52 52 M60 82 L60 46 M80 78 Q74 56 68 52" stroke={B} strokeWidth="2.5" fill="none" />
    </g>
  ),
  panini: (
    <g>
      <rect x="16" y="44" width="88" height="14" rx="6" fill={A} />
      <rect x="18" y="58" width="84" height="8" fill={C} />
      <rect x="16" y="66" width="88" height="14" rx="6" fill={A} />
      {[30, 46, 62, 78, 94].map((x) => (
        <line key={x} x1={x} y1="46" x2={x - 8} y2="56" stroke={B} strokeWidth="2.5" />
      ))}
    </g>
  ),
  slice: (
    <g>
      <path d="M20 84 L100 84 L100 58 L20 40 Z" fill={A} />
      <path d="M20 40 L100 58 L100 50 L20 32 Z" fill={C} />
      <circle cx="84" cy="44" r="7" fill={B} />
    </g>
  ),
  muffin: (
    <g>
      <circle cx="60" cy="52" r="28" fill={A} />
      <path d="M36 62 L84 62 L78 98 L42 98 Z" fill={C} />
      {[46, 56, 66, 76].map((x) => (
        <line key={x} x1={x} y1="64" x2={x - 2} y2="96" stroke={B} strokeWidth="2" />
      ))}
    </g>
  ),
  bites: (
    <g>
      {[[40, 50], [64, 44], [80, 66], [52, 72], [70, 88], [38, 90]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="11" fill={i % 2 ? A : C} />
      ))}
    </g>
  ),
};
