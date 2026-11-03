// Explicaciones derivadas de la puntuación real (contribuciones theta_i · x_i), no frases inventadas.
import type { Product } from "../types";
import type { SimulationContext } from "./context";
import { FEATURES, type FeatureEnv } from "./features";
import type { ArmScore } from "./linucb";

export interface Reason {
  kind: "factor" | "exploration" | "penalty" | "initial" | "baseline";
  text: string;
  /** Contribución numérica a la puntuación, cuando aplica. */
  weight?: number;
}

const MIN_CONTRIBUTION = 0.01;

export function explain(args: {
  product: Product;
  ctx: SimulationContext;
  x: number[];
  score: ArmScore;
  penalty: number;
  env: FeatureEnv;
}): Reason[] {
  const { x, score, penalty } = args;
  const reasons: Reason[] = [];

  if (score.n === 0) {
    reasons.push({ kind: "initial", text: "Recomendación inicial: todavía estamos aprendiendo." });
  }

  const contributions = FEATURES.map((f, i) => ({ f, c: score.theta[i] * x[i] }))
    .filter(({ c }) => c > MIN_CONTRIBUTION)
    .sort((a, b) => b.c - a.c)
    .slice(0, 3);
  for (const { f, c } of contributions) {
    const i = FEATURES.indexOf(f);
    reasons.push({ kind: "factor", text: factorText(f.key, x[i]), weight: round(c) });
  }

  if (score.n > 0 && score.exploration > Math.abs(score.expected)) {
    reasons.push({
      kind: "exploration",
      text: "El modelo lo está explorando porque todavía tiene pocos datos en este contexto.",
      weight: round(score.exploration),
    });
  }

  if (penalty > MIN_CONTRIBUTION) {
    reasons.push({
      kind: "penalty",
      text: "Bajó un poco porque la fila es alta y su tiempo de preparación configurado es mayor.",
      weight: round(-penalty),
    });
  }

  return reasons.slice(0, 4);
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Texto según el signo del valor: una contribución positiva con x<0 significa "lo favorece que sea bajo". */
function factorText(key: (typeof FEATURES)[number]["key"], value: number): string {
  const high = value > 0;
  switch (key) {
    case "temp":
      return high ? "Con calor, este producto ha tenido mejor respuesta." : "Con clima fresco, este producto ha tenido mejor respuesta.";
    case "queue":
      return high ? "Con fila alta, este producto ha tenido mejor respuesta." : "Con fila baja, este producto ha tenido mejor respuesta.";
    case "demand":
      return high ? "Con demanda alta, este producto ha tenido mejor respuesta." : "Con demanda baja, este producto ha tenido mejor respuesta.";
    default:
      return `${FEATURES.find((f) => f.key === key)!.label}.`;
  }
}
