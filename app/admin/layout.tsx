import type { Metadata } from "next";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminNav } from "@/components/admin/AdminNav";
import { adminAccess } from "@/lib/admin-session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import "./admin.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Panel · MenuPulse AI", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const access = await adminAccess();
  if (access === "denied") {
    return (
      <div className="ad-root">
        <AdminLogin configured={Boolean(process.env.ADMIN_ACCESS_CODE)} />
      </div>
    );
  }
  return (
    <div className="ad-root ad-shell">
      <AdminNav canLogout={access === "granted"} />
      <div className="ad-main">
        {access === "open-dev" && (
          <p className="ad-banner">Modo desarrollo: no hay ADMIN_ACCESS_CODE, así que el panel está abierto. En producción se pedirá el código.</p>
        )}
        {!isSupabaseConfigured() && (
          <p className="ad-banner ad-banner-warn">
            Sin Supabase configurado: los datos viven en memoria y se pierden al reiniciar el servidor. Llena .env.local para que el aprendizaje persista.
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
