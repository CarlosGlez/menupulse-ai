import type { NextRequest } from "next/server";
import { z } from "zod";
import { handle, readJson } from "@/lib/http";
import { recordInteraction } from "@/lib/services";

// No se acepta "reward" del cliente: la recompensa se deriva del tipo de evento en el servidor.
const Body = z.object({
  runId: z.string().uuid(),
  productId: z.string().uuid(),
  eventType: z.enum(["click", "add_to_cart", "remove_from_cart", "purchase", "rating_positive", "rating_negative"]),
});

export async function POST(req: NextRequest) {
  return handle(async () => recordInteraction(Body.parse(await readJson(req))));
}
