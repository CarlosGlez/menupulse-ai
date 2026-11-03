-- Pruebas de RLS y grants. Ejecutar con un usuario administrador (postgres) sobre una base con
-- migraciones + seed. Cada bloque lanza excepción si una regla no se cumple; todo corre en una
-- transacción que se revierte al final, así que no deja cambios.
begin;

-- 1) anon puede leer catálogo activo
set local role anon;
do $$ begin
  if (select count(*) from public.products) = 0 then raise exception 'FALLA: anon no ve productos'; end if;
  if (select count(*) from public.brands) <> 3 then raise exception 'FALLA: anon no ve las 3 marcas'; end if;
end $$;
reset role;

-- 2) un producto inactivo no es visible para anon
update public.products set is_active = false where slug = 'espresso';
set local role anon;
do $$ begin
  if exists (select 1 from public.products where slug = 'espresso') then raise exception 'FALLA: anon ve producto inactivo'; end if;
end $$;
reset role;

-- 3) anon NO puede leer el estado del modelo ni eventos
set local role anon;
do $$ begin
  begin
    perform 1 from public.model_states;
    raise exception 'FALLA: anon pudo leer model_states';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from public.interaction_events;
    raise exception 'FALLA: anon pudo leer interaction_events';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- 4) anon NO puede escribir eventos, órdenes ni catálogo
set local role anon;
do $$ begin
  begin
    insert into public.interaction_events (brand_id, event_type, source_mode)
      select id, 'click', 'interactive_demo' from public.brands limit 1;
    raise exception 'FALLA: anon pudo insertar eventos';
  exception when insufficient_privilege then null; end;
  begin
    update public.products set price = 1;
    raise exception 'FALLA: anon pudo modificar precios';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- 5) authenticated tampoco puede tocar el modelo directamente
set local role authenticated;
do $$ begin
  begin
    update public.model_states set training_events = 0;
    raise exception 'FALLA: authenticated pudo modificar model_states';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- 5b) anon no puede ejecutar las funciones de analítica
set local role anon;
do $$ begin
  begin
    perform * from public.event_counts((select id from public.brands limit 1));
    raise exception 'FALLA: anon pudo ejecutar event_counts';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- 6) RLS habilitado en todas las tablas de public
do $$ declare t record; begin
  for t in select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity loop
    raise exception 'FALLA: RLS deshabilitado en %', t.relname;
  end loop;
end $$;

select 'RLS OK' as resultado;
rollback;
