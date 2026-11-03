"use client";
import Link from "next/link";
import type { RecItem, Recommendation } from "@/lib/client/useStorefront";

/** "¿Por qué veo esto?": factores reales que contribuyeron a la puntuación. */
export function WhyThis({ item }: { item: RecItem }) {
  return (
    <details className="mp-why">
      <summary>¿Por qué veo esto?</summary>
      <ul>
        {item.reasons.map((r, i) => (
          <li key={i} data-kind={r.kind}>
            {r.text}
          </li>
        ))}
      </ul>
      <p className="mp-why-meta">
        {item.source === "trained" ? "Modelo entrenado" : "Modelo inicial"} · {item.observations}{" "}
        {item.observations === 1 ? "observación" : "observaciones"} de este producto
      </p>
    </details>
  );
}

export function ModelStamp({ rec }: { rec: Recommendation }) {
  const trained = rec.items.slice(0, rec.topK).some((i) => i.source === "trained");
  return (
    <p className="mp-model-stamp">
      {trained ? "Recomendado por el modelo entrenado" : "Recomendación inicial: el modelo todavía está aprendiendo"} · calculado en{" "}
      {rec.latencyMs.toFixed(1)} ms
      {rec.model.storage === "memory" && " · modo local sin persistencia"}
    </p>
  );
}

export function DemoFooter({ brandName }: { brandName: string }) {
  return (
    <footer className="mp-footer">
      <p>
        Proyecto académico MenuPulse AI, no afiliado a {brandName}. Productos de referencia pendientes de validar; precios, tiempos e
        inventario son de demostración. Ilustraciones propias, no son fotos de los productos.
      </p>
      <p>
        <Link href="/">Volver al inicio</Link>
      </p>
    </footer>
  );
}
