# Progreso por fases

## Fase 0 — Inspección (3 nov 2026)
- La carpeta solo tenía documentación (`CLAUDE.md`, `PROMPT_INICIAL_CLAUDE.md`, `docs/INVENTARIO_BASE_Y_NOTAS.md`). Se arrancó desde cero.
- Stack: Next.js 15 (App Router) + React 19 + TypeScript, Supabase (`@supabase/supabase-js`), zod y vitest. CSS propio, sin Tailwind.

## Fase 1 — Base técnica ✅
- `supabase/migrations/20261103000100_init_schema.sql`: todas las tablas de la sección 10, más `training_runs`, `revision` en `model_states` (control de concurrencia optimista) y `observation_closed` en `recommendation_runs` (cierre idempotente).
- RLS habilitado en todas las tablas. `anon`/`authenticated` solo pueden leer el catálogo activo; el resto se maneja desde el servidor.
- El seed se genera desde `lib/data/catalog.ts` (3 marcas, 22 categorías, 56 productos), que es la fuente única del catálogo.
- **Verificado:** las migraciones y el seed corren sin errores en PostgreSQL 16 local, y `supabase/tests/rls_test.sql` pasa (`RLS OK`).
- Capa de datos `lib/repo/`: usa Supabase si hay credenciales y, si no, memoria (solo para desarrollo, no persistente).

## Fase 4 — Motor LinUCB ✅ (adelantada porque no depende de la UI)
- Archivos en `lib/ai/`: `context`, `eligibility`, `features`, `linalg` (Cholesky), `linucb`, `rank`, `reward`, `explain`, `synthetic` y `train`.
- **Decisión de diseño:** el vector es principalmente de contexto. Una primera versión incluía indicadores del producto (frío, caliente…), pero eso hacía que la exploración inicial ya favoreciera ciertos productos sin datos, lo que confundía la medición del aprendizaje. Además, en LinUCB disjunto esos indicadores son constantes dentro del modelo de cada producto y quedan absorbidos por el sesgo.
- **Tests:** `npm test` corre 12 pruebas, todas pasan. Incluyen álgebra lineal, LinUCB, persistencia JSON, recompensa, que un producto agotado nunca se recomiende, horarios, que el modelo entrenado supere al inicial y que en día caluroso se destaquen bebidas frías.
- **Prueba de punta a punta de la API en modo memoria (build de producción):** recomendación → eventos → cierre de la observación (idempotente) → 3 lotes de 200 clientes en Degas. Recompensa promedio en el set de evaluación fijo de 200 clientes: modelo inicial 0.098, después de 3 lotes 0.201, baseline 0.158 (corrida con el código final).
- **Resultado honesto:** en Degas el aprendizaje es claro. En Domino's y Carl's la mejora sobre el modelo inicial es menor, porque el mundo simulado tiene menos señal contextual para esas marcas y la regla operativa de hora pico ya acerca el ranking inicial al óptimo.

## Fase 2 — Menús ✅
- Ruta `/menu/[brand]` con tres composiciones distintas (`components/brands/*`). Solo se comparten las piezas funcionales (`components/menu/*`): diálogo de producto, carrito y checkout, franja de contexto, "¿Por qué veo esto?" e ilustraciones SVG propias.
  - **Domino's:** azul y rojo, Archivo Black, tarjetas grandes con la pizza circular, pestañas horizontales y carrito en panel lateral.
  - **Carl's Jr.:** negro, amarillo y rojo, Anton condensada. Ranking tipo tablero de drive-thru, categorías en barra lateral y "Tu orden" fija en escritorio.
  - **Degas Café:** carta impresa en serif con puntos guía hacia el precio, sección "Hoy sugerimos" y secciones en dos columnas.
- Búsqueda por nombre, descripción u opción (sin acentos), filtro por categoría y "solo disponibles ahora". No hay filtro de alérgenos porque el catálogo no tiene ese dato y no se inventa.
- Personalización válida por producto (`lib/cart.ts`): grupos obligatorios, máximos y grupos dependientes (por ejemplo, el tamaño del combo solo aparece si eliges combo).
- El carrito permite agregar, editar, cambiar cantidad y quitar. Nunca se modifica cuando cambia la recomendación.
- **Checkout simulado** `POST /api/orders`: el servidor recalcula los precios desde el catálogo (ignora los del cliente), valida elegibilidad y stock y descuenta el stock demo. Después se pide una calificación de 1 a 5, que cierra la observación y actualiza el modelo.
- Atribución honesta: la recompensa de compra solo se da a productos que se agregaron mientras esa recomendación estaba activa.
- Venta complementaria en el carrito ("Para acompañar"): usa el ranking con el carrito como contexto y solo muestra categorías configuradas como complemento.
- **Verificado con Playwright** (build de producción):
  - Las tres marcas cargan sin errores de consola y sin scroll horizontal, en escritorio (1366 px) y móvil (390 px).
  - Precios: pizza Mexicana grande + orilla + jalapeño = $344; Famous Star en combo = $184; "Arma tu pizza" sin ingredientes muestra un error.
  - En "Mañana tranquila" aparecen 10 productos de Domino's como "Fuera de horario".
  - Flujo completo en Degas: escenario → producto → carrito → editar cantidad → orden → calificación → "el modelo actualizó 5 productos".
- **Supuesto de demo:** los horarios de los productos (pizzas y burgers solo de tarde y noche, paninis desde la tarde) los definí yo. Son editables y no son horarios oficiales.

## Fases 3, 5 y 6 — Panel, simulador, entrenamiento y analítica ✅
- `/admin` está protegido con `ADMIN_ACCESS_CODE`. La cookie guarda un hash del código. En desarrollo, sin código, el panel queda abierto y lo avisa; en producción, sin código, queda cerrado.
- **Simulador:** controla hora, día, clima, temperatura, lluvia, fila (con el lenguaje de cada marca), demanda y carrito simulado, con los 5 escenarios precargados.
  - Muestra el antes/después con flechas de cuántas posiciones subió o bajó cada producto, 1 a 3 factores reales, el tiempo medido del motor y si viene del modelo inicial o del entrenado.
  - "Usar estas condiciones en los menús" pasa el contexto a la tienda.
  - El historial de la sesión queda en pantalla y el completo en Historial.
- **Inventario limitado:** marca como agotado el producto configurado, que deja de aparecer en el ranking.
- **Manual vs. IA:** el mismo contexto con el menú fijo y con LinUCB lado a lado. No registra eventos.
- **Entrenamiento:** lotes de 10 a 200 clientes, varios lotes seguidos con opción de cancelar, semilla reproducible, contextos aleatorios o alrededor de un escenario y reinicio del modelo con confirmación.
  - Muestra una tabla menú fijo / IA antes / IA después: recompensa, CTR, carrito, conversión, ticket, preparación y diversidad.
  - Incluye una curva acumulada por lote y otra por ronda dentro del lote, hechas en SVG propio.
- **Analítica:** filtra entre `synthetic_batch` e `interactive_demo`. Muestra KPIs, productos más comprados, órdenes demo y calificación promedio. La agregación se hace en SQL (`supabase/migrations/20261103000200_analytics.sql`).
- **Catálogo e inventario:** disponibilidad y stock demo por producto.
- **Historial:** las últimas 30 ejecuciones con contexto, top 4 y motivos.
- **Modo kiosco** con `?kiosco=1`.
- **Verificado con Playwright** (build de producción con código de admin):
  - Sin sesión, el entrenamiento da 401 y un código incorrecto se rechaza.
  - En Degas, antes de entrenar, "Día caluroso" recomendaba muffin y pays. Después de 1000 clientes simulados recomendó Moka frappé, Frappé de chocolate, Frappé de coco y Americano frío. Con lluvia: chai, espresso y cappuccino arriba.
  - El producto agotado no aparece en el ranking y se reactiva desde Catálogo.
  - El panel en móvil (390 px) no tiene scroll horizontal.
- **Verificado en Postgres 16 local:** la nueva migración corre; `anon` no puede ejecutar las funciones de analítica (`RLS OK`) y `service_role` sí.

## Pendiente
- **Conectar el Supabase real** (ejecutar `supabase/setup_sql_editor.sql` y llenar `.env.local`) y repetir el recorrido del README para confirmar la persistencia. Toda la lógica está probada en memoria y en Postgres local, pero el cliente de Supabase nunca se ha ejecutado contra un proyecto real.
- Subir a GitHub y desplegar en Vercel (pasos en el README).
- Validar productos y precios con la carta vigente: todos son `demo_no_oficial`.
- Extras que no se hicieron por prioridad: ticket con QR, promociones configurables, editar precios y descripciones desde el panel, filtros de alérgenos (no hay datos) y autenticación con Supabase Auth (se usa un código de acceso).
- Detalle conocido: al reiniciar el modelo, la curva acumulada sigue mostrando los lotes anteriores al reinicio, porque el historial de lotes no se borra.
