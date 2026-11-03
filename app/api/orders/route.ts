import type { NextRequest } from "next/server";
import { z } from "zod";
import { SimulationContextSchema } from "@/lib/ai/context";
import { MAX_QTY } from "@/lib/cart";
import { BrandSchema, handle, readJson } from "@/lib/http";
import { placeOrder } from "@/lib/services";

// El cliente NO envía precios: el servidor los recalcula desde el catálogo.
const Body = z.object({
  brand: BrandSchema,
  runId: z.string().uuid().nullable().default(null),
  sessionId: z.string().uuid().nullable().default(null),
  context: SimulationContextSchema,
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(MAX_QTY),
        selections: z.record(z.string().max(40), z.array(z.string().max(40)).max(10)),
      }),
    )
    .min(1)
    .max(30),
});

export async function POST(req: NextRequest) {
  return handle(async () => placeOrder(Body.parse(await readJson(req))));
}
