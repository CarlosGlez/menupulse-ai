// Función de recompensa transparente. Cada observación = (recomendación, producto).
// Cada tipo de evento cuenta UNA sola vez por observación (evita duplicar recompensa)
// y el total se limita al rango [-1, 1].
import type { InteractionEventType } from "../types";
import { clampReward } from "./linucb";

export const REWARD_TABLE: Record<InteractionEventType, number> = {
  impression: 0,
  click: 0.1,
  add_to_cart: 0.45,
  purchase: 0.35,
  rating_positive: 0.2,
  rating_negative: -0.25,
  remove_from_cart: -0.1,
};

export function rewardForEvents(events: InteractionEventType[]): number {
  const unique = new Set(events);
  let total = 0;
  for (const e of unique) total += REWARD_TABLE[e];
  return clampReward(total);
}
