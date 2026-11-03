import "server-only";
import { isSupabaseConfigured } from "../supabase/server";
import { memoryRepo } from "./memory";
import { supabaseRepo } from "./supabase";
import type { Repo } from "./types";

/** Supabase si hay credenciales; si no, memoria (solo desarrollo, NO persistente). */
export function getRepo(): Repo {
  return isSupabaseConfigured() ? supabaseRepo : memoryRepo;
}

export type { Repo } from "./types";
