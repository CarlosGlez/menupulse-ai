import type { NextRequest } from "next/server";
import { BrandSchema, handle } from "@/lib/http";
import { getRepo } from "@/lib/repo";
import { HttpError } from "@/lib/services";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ brand: string }> }) {
  return handle(async () => {
    const brand = BrandSchema.parse((await params).brand);
    const menu = await getRepo().getMenu(brand);
    if (!menu) throw new HttpError(404, "Marca no encontrada");
    return { ...menu, storage: getRepo().kind };
  });
}
