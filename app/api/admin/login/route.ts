import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE, adminCookieValue, readJson } from "@/lib/http";
import { timingSafeEqual } from "node:crypto";

const Body = z.object({ code: z.string().min(1).max(200) });

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await readJson(req).catch(() => null));
  const expected = process.env.ADMIN_ACCESS_CODE;
  if (!parsed.success || !expected) return NextResponse.json({ error: "Código inválido" }, { status: 401 });
  const a = Buffer.from(parsed.data.code);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "Código inválido" }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, adminCookieValue(expected), { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 });
  return res;
}
