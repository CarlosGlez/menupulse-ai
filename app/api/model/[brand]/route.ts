import type { NextRequest } from "next/server";
import { BrandSchema, handle, requireAdmin } from "@/lib/http";
import { modelStatus } from "@/lib/services";

export async function GET(req: NextRequest, { params }: { params: Promise<{ brand: string }> }) {
  return handle(async () => {
    requireAdmin(req);
    return modelStatus(BrandSchema.parse((await params).brand));
  });
}
