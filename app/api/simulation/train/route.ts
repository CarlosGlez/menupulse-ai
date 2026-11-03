import type { NextRequest } from "next/server";
import { z } from "zod";
import { MAX_BATCH } from "@/lib/ai/train";
import { BrandSchema, handle, readJson, requireAdmin } from "@/lib/http";
import { runTraining } from "@/lib/services";

const Body = z.object({
  brand: BrandSchema,
  customers: z.number().int().min(1).max(MAX_BATCH),
  seed: z.number().int().min(0).max(2_147_483_647),
  scenarioId: z.string().max(40).nullable().default(null),
});

export async function POST(req: NextRequest) {
  return handle(async () => {
    requireAdmin(req);
    return runTraining(Body.parse(await readJson(req)));
  });
}
