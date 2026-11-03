"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const IDLE_SECONDS = 90;

/**
 * Modo kiosco (?kiosco=1): letra y botones más grandes, botón de pantalla completa y regreso
 * automático al inicio tras 90 s sin actividad (con aviso de 10 s para cancelar).
 */
export function Kiosk() {
  const router = useRouter();
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("mp-kiosk");
    let last = Date.now();
    const bump = () => {
      last = Date.now();
      setLeft(null);
    };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const t = setInterval(() => {
      const idle = (Date.now() - last) / 1000;
      if (idle >= IDLE_SECONDS) router.push("/?kiosco=1");
      else if (idle >= IDLE_SECONDS - 10) setLeft(Math.ceil(IDLE_SECONDS - idle));
    }, 1000);
    return () => {
      document.documentElement.classList.remove("mp-kiosk");
      events.forEach((e) => window.removeEventListener(e, bump));
      clearInterval(t);
    };
  }, [router]);

  return (
    <>
      <button
        type="button"
        className="mp-kiosk-full"
        onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {})}
      >
        Pantalla completa
      </button>
      {left !== null && (
        <div className="mp-kiosk-idle" role="alertdialog" aria-live="assertive" aria-label="Inactividad">
          ¿Sigues ahí? Volveremos al inicio en {left} s. Toca la pantalla para continuar.
        </div>
      )}
    </>
  );
}
