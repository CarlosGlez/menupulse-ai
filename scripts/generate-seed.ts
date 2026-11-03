// Genera supabase/seed.sql desde lib/data/catalog.ts (fuente única del catálogo demo)
// y supabase/setup_sql_editor.sql (migraciones + seed) para pegar en el SQL Editor de Supabase.
// Uso: npm run seed:generate
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { BRANDS, CATEGORIES, PRODUCTS } from "../lib/data/catalog";

const q = (v: string | null) => (v === null ? "null" : `'${v.replace(/'/g, "''")}'`);
const arr = (v: string[]) => `array[${v.map(q).join(",")}]::text[]`;
const json = (v: unknown) => `${q(JSON.stringify(v))}::jsonb`;

const lines: string[] = [
  "-- GENERADO por scripts/generate-seed.ts — no editar a mano.",
  "-- Catálogo DEMO: precios, tiempos y stock son valores de demostración, NO oficiales.",
  "begin;",
];

for (const b of BRANDS) {
  lines.push(
    `insert into public.brands (id, slug, name, description, queue_label) values (${q(b.id)}, ${q(b.slug)}, ${q(b.name)}, ${q(b.description)}, ${q(b.queueLabel)})
  on conflict (id) do update set name = excluded.name, description = excluded.description, queue_label = excluded.queue_label;`,
  );
}
for (const c of CATEGORIES) {
  lines.push(
    `insert into public.categories (id, brand_id, slug, name, sort_order) values (${q(c.id)}, ${q(c.brandId)}, ${q(c.slug)}, ${q(c.name)}, ${c.sortOrder})
  on conflict (id) do update set name = excluded.name, sort_order = excluded.sort_order;`,
  );
}
for (const p of PRODUCTS) {
  lines.push(
    `insert into public.products (id, brand_id, category_id, slug, name, description, price, currency, image_path, tags, dayparts, prep_time_seconds, is_available, is_active, stock_demo, dietary_tags, modifiers, complement_category_slugs, price_source, source_url)
  values (${q(p.id)}, ${q(p.brandId)}, ${q(p.categoryId)}, ${q(p.slug)}, ${q(p.name)}, ${q(p.description)}, ${p.price ?? "null"}, 'MXN', ${q(p.imagePath)}, ${arr(p.tags)}, ${arr(p.dayparts)}, ${p.prepTimeSeconds ?? "null"}, ${p.isAvailable}, ${p.isActive}, ${p.stockDemo ?? "null"}, ${arr(p.dietaryTags)}, ${json(p.modifiers)}, ${arr(p.complementCategorySlugs)}, ${q(p.priceSource)}, ${q(p.sourceUrl)})
  on conflict (id) do update set name = excluded.name, description = excluded.description, tags = excluded.tags, dayparts = excluded.dayparts, modifiers = excluded.modifiers, complement_category_slugs = excluded.complement_category_slugs;`,
  );
}
lines.push("commit;", "");

const root = path.resolve(__dirname, "..");
const seed = lines.join("\n");
writeFileSync(path.join(root, "supabase/seed.sql"), seed);

const migDir = path.join(root, "supabase/migrations");
const migrations = readdirSync(migDir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => `-- ===== ${f} =====\n${readFileSync(path.join(migDir, f), "utf8")}`);
writeFileSync(
  path.join(root, "supabase/setup_sql_editor.sql"),
  `-- Pega TODO este archivo en Supabase → SQL Editor → Run (proyecto nuevo/vacío).\n\n${migrations.join("\n\n")}\n\n-- ===== seed.sql =====\n${seed}`,
);
console.log(`seed.sql: ${BRANDS.length} marcas, ${CATEGORIES.length} categorías, ${PRODUCTS.length} productos`);
