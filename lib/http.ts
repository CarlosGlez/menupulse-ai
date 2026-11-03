import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { HttpError } from "./services";
import { BRAND_SLUGS } from "./types";

export const BrandSchema = z.enum(BRAND_SLUGS as [string, ...string[]]).transform((s) => s as (typeof BRAND_SLUGS)[number]);

export const ADMIN_COOKIE = "mp_admin";

/** La cookie guarda un hash del código, no el código en claro. */
export function adminCookieValue(code: string): string {
  return createHash("sha256").update(`menupulse-admin:${code}`).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Admin si el código coincide con ADMIN_ACCESS_CODE. Sin código configurado: abierto solo en desarrollo. */
export function isAdmin(req: NextRequest): boolean {
  const code = process.env.ADMIN_ACCESS_CODE;
  if (!code) return process.env.NODE_ENV !== "production";
  const header = req.headers.get("x-admin-code");
  if (header) return safeEqual(header, code);
  return safeEqual(req.cookies.get(ADMIN_COOKIE)?.value ?? "", adminCookieValue(code));
}

export function requireAdmin(req: NextRequest) {
  if (!isAdmin(req)) throw new HttpError(401, "Se requiere acceso de administración");
}

export async function handle(fn: () => Promise<unknown>) {
  try {
    return NextResponse.json(await fn());
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Solicitud inválida", issues: e.issues }, { status: 400 });
    console.error(e);
    // En desarrollo se muestra el detalle para poder diagnosticar; en producción no se filtran detalles internos.
    const detail = process.env.NODE_ENV !== "production" && e instanceof Error ? `: ${e.message}` : "";
    return NextResponse.json({ error: `Error interno${detail}` }, { status: 500 });
  }
}

export async function readJson(req: NextRequest): Promise<unknown> {
  const text = await req.text();
  if (text.length > 20_000) throw new HttpError(413, "Solicitud demasiado grande");
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new HttpError(400, "JSON inválido");
  }
}
