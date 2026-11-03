import type { NextRequest } from "next/server";
import { z } from "zod";
import { handle, readJson } from "@/lib/http";
import { orderFeedback } from "@/lib/services";

const Body = z.object({ orderId: z.string().uuid(), rating: z.number().int().min(1).max(5).nullable() });

export async function POST(req: NextRequest) {
  return handle(async () => orderFeedback(Body.parse(await readJson(req))));
}
