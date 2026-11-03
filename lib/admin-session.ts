import "server-only";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminCookieValue } from "./http";

/** Estado de acceso al panel desde Server Components. */
export async function adminAccess(): Promise<"open-dev" | "granted" | "denied"> {
  const code = process.env.ADMIN_ACCESS_CODE;
  if (!code) return process.env.NODE_ENV !== "production" ? "open-dev" : "denied";
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  return value === adminCookieValue(code) ? "granted" : "denied";
}
