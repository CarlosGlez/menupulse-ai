-- MenuPulse AI — esquema inicial (proyecto académico, datos simulados).
-- Ejecutar en orden. Todas las tablas tienen RLS habilitado.

create extension if not exists pgcrypto;

-- ---------- Catálogo ----------
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug in ('dominos', 'carls-jr', 'degas-cafe')),
  name text not null,
  description text not null default '',
  queue_label text not null default 'clientes en fila',
  theme jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  slug text not null,
  name text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  unique (brand_id, slug)
);
create index categories_brand_idx on public.categories(brand_id);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  slug text not null,
  name text not null,
  description text not null default '',
  price numeric(10,2) check (price is null or price >= 0),
  currency text not null default 'MXN',
  image_path text,
  tags text[] not null default '{}',
  dayparts text[] not null default '{morning,afternoon,evening}',
  prep_time_seconds int check (prep_time_seconds is null or prep_time_seconds > 0),
  is_available boolean not null default true,
  is_active boolean not null default true,
  stock_demo int check (stock_demo is null or stock_demo >= 0),
  allergens jsonb,
  dietary_tags text[] not null default '{}',
  modifiers jsonb not null default '[]'::jsonb,
  complement_category_slugs text[] not null default '{}',
  price_source text not null default 'demo_no_oficial',
  source_url text,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, slug)
);
create index products_brand_idx on public.products(brand_id);
create index products_category_idx on public.products(category_id);

-- ---------- Simulación y eventos ----------
create table public.simulation_sessions (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  mode text not null check (mode in ('interactive_demo', 'synthetic_batch')),
  scenario_name text,
  context jsonb not null,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index simulation_sessions_brand_idx on public.simulation_sessions(brand_id, created_at desc);

create table public.recommendation_runs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.simulation_sessions(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  model_version text not null,
  algorithm text not null,
  mode text not null check (mode in ('adaptive', 'baseline')),
  context jsonb not null,
  ranked_items jsonb not null,
  latency_ms numeric(10,3),
  observation_closed boolean not null default false,
  created_at timestamptz not null default now()
);
create index recommendation_runs_brand_idx on public.recommendation_runs(brand_id, created_at desc);
create index recommendation_runs_session_idx on public.recommendation_runs(session_id);

create table public.interaction_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.simulation_sessions(id) on delete cascade,
  recommendation_run_id uuid references public.recommendation_runs(id) on delete set null,
  brand_id uuid not null references public.brands(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  event_type text not null check (event_type in
    ('impression','click','add_to_cart','remove_from_cart','purchase','rating_positive','rating_negative')),
  source_mode text not null check (source_mode in ('interactive_demo', 'synthetic_batch')),
  reward numeric(6,4) check (reward is null or reward between -1 and 1),
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index interaction_events_brand_idx on public.interaction_events(brand_id, source_mode, created_at desc);
create index interaction_events_run_idx on public.interaction_events(recommendation_run_id);
create index interaction_events_session_idx on public.interaction_events(session_id);
create index interaction_events_product_idx on public.interaction_events(product_id);

-- ---------- Estado del modelo ----------
create table public.model_states (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null unique references public.brands(id) on delete cascade,
  algorithm text not null,
  model_version text not null,
  feature_version int not null,
  alpha numeric(8,4) not null,
  parameters jsonb not null default '{}'::jsonb,
  training_events int not null default 0,
  revision int not null default 0,
  updated_at timestamptz not null default now()
);

-- Historial de lotes de entrenamiento (curva de aprendizaje y comparación).
create table public.training_runs (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  session_id uuid references public.simulation_sessions(id) on delete set null,
  customers int not null check (customers between 1 and 200),
  seed bigint not null,
  scenario_name text,
  result jsonb not null,
  training_events_after int not null,
  created_at timestamptz not null default now()
);
create index training_runs_brand_idx on public.training_runs(brand_id, created_at desc);

-- ---------- Órdenes DEMO (checkout simulado) ----------
create table public.orders_demo (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  session_id uuid references public.simulation_sessions(id) on delete set null,
  recommendation_run_id uuid references public.recommendation_runs(id) on delete set null,
  order_number text not null,
  subtotal numeric(10,2) not null check (subtotal >= 0),
  total numeric(10,2) not null check (total >= 0),
  currency text not null default 'MXN',
  context jsonb not null,
  rating smallint check (rating is null or rating between 1 and 5),
  is_simulated boolean not null default true check (is_simulated),
  created_at timestamptz not null default now()
);
create index orders_demo_brand_idx on public.orders_demo(brand_id, created_at desc);

create table public.order_items_demo (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders_demo(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  quantity int not null check (quantity between 1 and 50),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  modifiers jsonb not null default '{}'::jsonb,
  line_total numeric(10,2) not null check (line_total >= 0)
);
create index order_items_demo_order_idx on public.order_items_demo(order_id);

-- updated_at automático en productos
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- ---------- Seguridad: RLS + grants ----------
alter table public.brands enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.simulation_sessions enable row level security;
alter table public.recommendation_runs enable row level security;
alter table public.interaction_events enable row level security;
alter table public.model_states enable row level security;
alter table public.training_runs enable row level security;
alter table public.orders_demo enable row level security;
alter table public.order_items_demo enable row level security;

-- Visitantes (anon/authenticated) solo LEEN catálogo activo. Todo lo demás pasa por el servidor
-- con la clave secreta (que omite RLS) y validación en los Route Handlers.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.brands, public.categories, public.products to anon, authenticated;

create policy "catálogo: marcas activas visibles" on public.brands
  for select to anon, authenticated using (active);
create policy "catálogo: categorías activas visibles" on public.categories
  for select to anon, authenticated using (active);
create policy "catálogo: productos activos visibles" on public.products
  for select to anon, authenticated using (is_active);

-- Tablas futuras en public tampoco quedan expuestas por defecto a anon/authenticated.
alter default privileges in schema public revoke all on tables from anon, authenticated;
