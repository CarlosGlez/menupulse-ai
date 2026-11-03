import type { NextRequest } from "next/server";
import { z } from "zod";
import { handle, readJson } from "@/lib/http";
import { closeObservation } from "@/lib/services";

const Body = z.object({ runId: z.string().uuid() });

export async function POST(req: NextRequest) {
  return handle(async () => closeObservation(Body.parse(await readJson(req)).runId));
}
