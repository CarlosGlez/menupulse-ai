"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/simulador", label: "Simulador" },
  { href: "/admin/comparador", label: "Manual vs. IA" },
  { href: "/admin/entrenamiento", label: "Entrenamiento" },
  { href: "/admin/analitica", label: "Analítica" },
  { href: "/admin/catalogo", label: "Catálogo e inventario" },
  { href: "/admin/historial", label: "Historial" },
];

export function AdminNav({ canLogout }: { canLogout: boolean }) {
  const path = usePathname();
  return (
    <nav className="mpa-nav" aria-label="Secciones del panel">
      <Link href="/" className="mpa-home">
        MenuPulse AI
      </Link>
      <ul>
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link href={l.href} aria-current={path === l.href ? "page" : undefined}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
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
    </nav>
  );
}
