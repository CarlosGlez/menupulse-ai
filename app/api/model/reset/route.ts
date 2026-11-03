import type { NextRequest } from "next/server";
import { z } from "zod";
import { BrandSchema, handle, readJson, requireAdmin } from "@/lib/http";
import { resetModel } from "@/lib/services";

const Body = z.object({ brand: BrandSchema, confirm: z.literal(true) });

export async function POST(req: NextRequest) {
  return handle(async () => {
    requireAdmin(req);
    return resetModel(Body.parse(await readJson(req)).brand);
  });
}
