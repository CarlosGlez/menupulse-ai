"use client";
import { useEffect, useRef } from "react";

/** Panel lateral modal (dialog nativo: atrapa el foco y se cierra con Esc). */
export function Drawer({ open, onClose, label, children, className }: { open: boolean; onClose: () => void; label: string; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`mp-drawer ${className ?? ""}`}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // clic en el fondo
      }}
    >
      <div className="mp-drawer-inner">
        <button type="button" className="mp-dialog-close" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
        {children}
      </div>
    </dialog>
  );
}
