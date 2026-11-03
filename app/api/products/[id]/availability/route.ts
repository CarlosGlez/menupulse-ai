import type { NextRequest } from "next/server";
import { z } from "zod";
import { handle, readJson, requireAdmin } from "@/lib/http";
import { getRepo } from "@/lib/repo";

const Body = z.object({
  isAvailable: z.boolean().optional(),
  stockDemo: z.number().int().min(0).max(9999).nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    requireAdmin(req);
    const id = z.string().uuid().parse((await params).id);
    await getRepo().setAvailability(id, Body.parse(await readJson(req)));
    return { ok: true };
  });
}
