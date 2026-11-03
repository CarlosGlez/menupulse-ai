// LinUCB disjunto: un modelo lineal (A_a, b_a) por producto/acción.
//   theta_a     = A_a⁻¹ b_a
//   expected    = theta_a · x
//   uncertainty = sqrt(xᵀ A_a⁻¹ x)
//   score       = expected + alpha · uncertainty
// Actualización con recompensa r:  A_a += x xᵀ ;  b_a += r x
import { FEATURE_DIM, FEATURE_VERSION } from "./features";
import { addOuterInPlace, allFinite, cholesky, choleskySolve, dot, identity } from "./linalg";

export const ALGORITHM = "linucb-disjoint";
export const MODEL_VERSION = "linucb-v1";
export const DEFAULT_ALPHA = 0.35;
export const REWARD_MIN = -1;
export const REWARD_MAX = 1;

export interface ArmState {
  A: number[]; // d*d fila-mayor
  b: number[]; // d
  n: number; // observaciones
}

export interface LinUCBModel {
  algorithm: typeof ALGORITHM;
  modelVersion: string;
  featureVersion: number;
  alpha: number;
  arms: Record<string, ArmState>;
  trainingEvents: number;
}

export function createModel(alpha = DEFAULT_ALPHA): LinUCBModel {
  return {
    algorithm: ALGORITHM,
    modelVersion: MODEL_VERSION,
    featureVersion: FEATURE_VERSION,
    alpha,
    arms: {},
    trainingEvents: 0,
  };
}

/** Si el vector de características cambió de versión, el modelo guardado ya no es válido. */
export function ensureCompatible(model: LinUCBModel | null | undefined): LinUCBModel {
  if (!model || model.featureVersion !== FEATURE_VERSION || model.algorithm !== ALGORITHM) {
    return createModel(model?.alpha ?? DEFAULT_ALPHA);
  }
  return model;
}

function newArm(): ArmState {
  return { A: identity(FEATURE_DIM), b: new Array(FEATURE_DIM).fill(0), n: 0 };
}

export function getArm(model: LinUCBModel, armId: string): ArmState {
  return model.arms[armId] ?? newArm();
}

export interface ArmScore {
  theta: number[];
  expected: number;
  uncertainty: number;
  exploration: number;
  score: number;
  n: number;
}

export function scoreArm(model: LinUCBModel, armId: string, x: number[]): ArmScore {
  if (x.length !== FEATURE_DIM || !allFinite(x)) throw new Error("Vector de características inválido");
  const arm = getArm(model, armId);
  const L = cholesky(arm.A, FEATURE_DIM);
  const theta = choleskySolve(L, arm.b);
  const Ainvx = choleskySolve(L, x);
  const expected = dot(theta, x);
  const uncertainty = Math.sqrt(Math.max(0, dot(x, Ainvx)));
  const exploration = model.alpha * uncertainty;
  return { theta, expected, uncertainty, exploration, score: expected + exploration, n: arm.n };
}

export function clampReward(r: number): number {
  if (!Number.isFinite(r)) throw new Error("Recompensa no numérica");
  return Math.min(REWARD_MAX, Math.max(REWARD_MIN, r));
}

/** Actualiza (in place) el brazo con la recompensa observada. */
export function updateArm(model: LinUCBModel, armId: string, x: number[], reward: number): void {
  if (x.length !== FEATURE_DIM || !allFinite(x)) throw new Error("Vector de características inválido");
  const r = clampReward(reward);
  const arm = model.arms[armId] ?? newArm();
  addOuterInPlace(arm.A, x);
  for (let i = 0; i < FEATURE_DIM; i++) arm.b[i] += r * x[i];
  arm.n += 1;
  model.arms[armId] = arm;
  model.trainingEvents += 1;
}
