import type { NextRequest } from "next/server";
import { z } from "zod";
import { SimulationContextSchema } from "@/lib/ai/context";
import { BrandSchema, handle, readJson } from "@/lib/http";
import { recommend } from "@/lib/services";

const Body = z.object({
  brand: BrandSchema,
  context: SimulationContextSchema,
  mode: z.enum(["adaptive", "baseline"]).default("adaptive"),
  sessionId: z.string().uuid().nullable().default(null),
  scenarioName: z.string().max(80).nullable().default(null),
  /** false = solo calcular (p. ej. vista previa del comparador) sin registrar impresiones. */
  persist: z.boolean().default(true),
  logImpressions: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  return handle(async () => recommend(Body.parse(await readJson(req))));
}
