"use client";
import type { Recommendation } from "@/lib/client/useStorefront";
import type { Product } from "@/lib/types";

/** Ranking con el cambio de posición respecto a otro ranking (antes/después o manual/IA). */
export function RankList({
  rec,
  compareTo,
  products,
  limit = 8,
  showReasons = true,
}: {
  rec: Recommendation;
  compareTo?: Recommendation | null;
  products: Map<string, Product>;
  limit?: number;
  showReasons?: boolean;
}) {
  const prev = new Map(compareTo?.items.map((i) => [i.productId, i.position]) ?? []);
  return (
    <ol className="ad-rank">
      {rec.items.slice(0, limit).map((i) => {
        const before = prev.get(i.productId);
        let move: { cls: string; text: string } | null = null;
        if (compareTo) {
          if (before === undefined) move = { cls: "new", text: "nuevo" };
          else if (before > i.position) move = { cls: "up", text: `▲ ${before - i.position}` };
          else if (before < i.position) move = { cls: "down", text: `▼ ${i.position - before}` };
          else move = { cls: "same", text: "=" };
        }
        const p = products.get(i.productId);
        return (
          <li key={i.productId}>
            <span className="pos">{i.position}</span>
            <span>
              <span className="name">{p?.name ?? i.productId}</span>{" "}
              <span className="ad-src">
                {i.source === "baseline" ? "orden fijo" : `${i.source === "trained" ? "entrenado" : "inicial"} · ${i.observations} obs. · puntaje ${i.score.toFixed(3)}`}
              </span>
            </span>
            {move ? (
              <span className={`ad-move ${move.cls}`} title={before ? `Antes en la posición ${before}` : "No estaba en el ranking"}>
                {move.text}
              </span>
            ) : (
              <span />
            )}
            {showReasons && i.reasons.length > 0 && (
              <ul className="reasons">
                {i.reasons.slice(0, 3).map((r, k) => (
                  <li key={k}>{r.text}</li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}
