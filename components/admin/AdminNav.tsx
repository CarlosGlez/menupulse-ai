"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Íconos de trazo simple (propios), 20×20.
const ICONS: Record<string, React.ReactNode> = {
  resumen: <path d="M3 3h6v6H3zM11 3h6v6h-6zM3 11h6v6H3zM11 11h6v6h-6z" />,
  simulador: <path d="M4 5h12M4 10h12M4 15h12M7 3v4M13 8v4M9 13v4" />,
  comparador: <path d="M10 3v14M3 6h4v8H3zM13 4h4v12h-4z" />,
  entrenamiento: <path d="M3 16l4-5 3 3 7-9M13 5h4v4" />,
  analitica: <path d="M4 17V9M10 17V4M16 17v-6M2 17h16" />,
  catalogo: <path d="M3 6l7-3 7 3-7 3-7-3zM3 6v8l7 3 7-3V6M10 9v8" />,
  historial: <path d="M10 5v5l3 2M3.5 10a6.5 6.5 0 1 0 2-4.7M3 3v3h3" />,
};

const LINKS = [
  { href: "/admin", label: "Resumen", icon: "resumen" },
  { href: "/admin/simulador", label: "Simulador", icon: "simulador" },
  { href: "/admin/comparador", label: "Manual vs. IA", icon: "comparador" },
  { href: "/admin/entrenamiento", label: "Entrenamiento", icon: "entrenamiento" },
  { href: "/admin/analitica", label: "Analítica", icon: "analitica" },
  { href: "/admin/catalogo", label: "Catálogo e inventario", icon: "catalogo" },
  { href: "/admin/historial", label: "Historial", icon: "historial" },
];

function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 20 20" className="mpa-icon" aria-hidden="true" focusable="false">
      {ICONS[name]}
    </svg>
  );
}

export function AdminNav({ canLogout }: { canLogout: boolean }) {
  const path = usePathname();
  return (
    <nav className="mpa-nav" aria-label="Secciones del panel">
      <Link href="/" className="mpa-home">
        <span className="mpa-pulse" aria-hidden="true" />
        <span>
          MenuPulse AI
          <small>Panel de control</small>
        </span>
      </Link>
      <ul>
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link href={l.href} aria-current={path === l.href ? "page" : undefined}>
              <Icon name={l.icon} />
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="mpa-nav-foot">
        <Link href="/" className="mpa-nav-menus">
          Ver los menús
        </Link>
        {canLogout && (
          <button
            type="button"
            className="mpa-logout"
            onClick={async () => {
              await fetch("/api/admin/logout", { method: "POST" });
              window.location.reload();
            }}
          >
            Cerrar sesión
          </button>
        )}
      </div>
    </nav>
  );
}
