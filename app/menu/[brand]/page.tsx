import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DominosMenu } from "@/components/brands/dominos/DominosMenu";
import { CarlsMenu } from "@/components/brands/carls-jr/CarlsMenu";
import { DegasMenu } from "@/components/brands/degas-cafe/DegasMenu";
import { Kiosk } from "@/components/menu/Kiosk";
import { getRepo } from "@/lib/repo";
import { BRAND_SLUGS, type BrandSlug } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ brand: string }> }): Promise<Metadata> {
  const { brand } = await params;
  const names: Record<string, string> = { dominos: "Domino's Pizza", "carls-jr": "Carl's Jr.", "degas-cafe": "Degas Café" };
  return { title: `${names[brand] ?? "Menú"} · MenuPulse AI (demo)` };
}

export default async function MenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ brand: string }>;
  searchParams: Promise<{ kiosco?: string }>;
}) {
  const { brand } = await params;
  const kiosk = (await searchParams).kiosco === "1";
  if (!BRAND_SLUGS.includes(brand as BrandSlug)) notFound();
  const menu = await getRepo().getMenu(brand as BrandSlug);
  if (!menu) notFound();
  const view = brand === "dominos" ? <DominosMenu menu={menu} /> : brand === "carls-jr" ? <CarlsMenu menu={menu} /> : <DegasMenu menu={menu} />;
  return (
    <>
      {view}
      {kiosk && <Kiosk />}
    </>
  );
}
