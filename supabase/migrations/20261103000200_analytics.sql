-- Funciones de agregación para la analítica del panel (evitan traer miles de filas al servidor).
-- Solo las ejecuta el servidor con la clave secreta; anon/authenticated no tienen permiso.

create or replace function public.event_counts(p_brand uuid)
returns table (source_mode text, event_type text, product_id uuid, n bigint)
language sql stable
set search_path = ''
as $$
  select e.source_mode, e.event_type, e.product_id, count(*)::bigint
  from public.interaction_events e
  where e.brand_id = p_brand
  group by e.source_mode, e.event_type, e.product_id;
$$;

create or replace function public.order_stats(p_brand uuid)
returns table (orders bigint, avg_total numeric, avg_rating numeric, rated bigint)
language sql stable
set search_path = ''
as $$
  select count(*)::bigint, coalesce(avg(o.total), 0), avg(o.rating), count(o.rating)::bigint
  from public.orders_demo o
  where o.brand_id = p_brand;
$$;

revoke all on function public.event_counts(uuid) from public, anon, authenticated;
revoke all on function public.order_stats(uuid) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.event_counts(uuid) to service_role;
    grant execute on function public.order_stats(uuid) to service_role;
  end if;
end $$;
