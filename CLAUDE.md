# MenuPulse AI — Guía principal para Claude

> **Documento rector del proyecto.** Claude debe leer este archivo completo antes de proponer arquitectura, modificar código o crear archivos. Si ya existe un repositorio, primero debe inspeccionarlo y conservar lo que funcione. No debe reemplazar el proyecto por una plantilla nueva sin justificarlo.

## 1. Resumen ejecutivo

Construir una plataforma web académica de **menús digitales adaptativos** para tres marcas de comida con experiencias visuales independientes:

1. **Domino's Pizza** — pizzería.
2. **Carl's Jr.** — hamburguesería.
3. **Degas Café** — cafetería.

El sistema simula variables de operación y contexto —clima, temperatura, hora, día, cantidad de vehículos/clientes en fila, nivel de demanda, disponibilidad y productos populares— y utiliza un motor de aprendizaje para **reordenar, destacar y recomendar productos** de cada menú según el contexto.

El proyecto toma como referencia conceptual el anuncio de McDonald's de marzo de 2019 sobre Dynamic Yield. No debe presentarse como una copia del sistema de McDonald's ni afirmar que los menús reales de las tres marcas cambian actualmente con IA. Es una demostración académica independiente.

**Nombre de trabajo:** MenuPulse AI. Puede cambiarse sin afectar la arquitectura.

**Objetivo central de evaluación:** demostrar, en una misma aplicación, tres experiencias de menú reconocibles y completas, un panel de simulación comprensible y un motor adaptativo que mejore sus recomendaciones conforme recibe interacciones simuladas.

## 2. Reglas no negociables

- La plataforma es una **simulación académica**. No se conectará a inventarios, cajas, ventas, sucursales ni sistemas privados de las marcas.
- Las variables de clima, hora, demanda, tráfico y fila serán controladas desde el panel de simulación. No se necesitan APIs externas de clima, mapas, tráfico ni geolocalización.
- El aprendizaje debe ser persistente. Al recargar la aplicación, el modelo debe conservar sus parámetros y el historial registrado en Supabase.
- El sistema no puede llamarse “IA que aprende” si únicamente aplica `if/else` estáticos. Debe incluir un algoritmo de aprendizaje online, registrar recompensas y mostrar evidencia de mejora.
- Las reglas de negocio pueden filtrar productos no disponibles o fuera de horario, pero el ranking adaptativo debe depender del modelo aprendido y del contexto.
- La IA **no debe cambiar precios** ni inventar productos, promociones, ingredientes, disponibilidad o tiempos de preparación.
- El menú completo debe seguir accesible. La IA reorganiza y destaca; no debe esconder de manera engañosa productos elegibles ni forzar una compra.
- Cada marca debe tener un diseño propio. No crear una misma página genérica y limitarse a cambiar el color del encabezado.
- Todas las métricas y órdenes generadas por el simulador deben identificarse como **datos simulados**. No presentarlas como ventas reales.
- No usar claves privadas en el navegador. La clave privilegiada de Supabase, si se necesita en servidor, nunca debe tener prefijo `NEXT_PUBLIC_`.
- No incorporar pasarelas de pago reales. El checkout es una demostración.
- No copiar directamente fotografías, logos, tipografías propietarias ni recursos protegidos sin permiso. Mantener los recursos reemplazables y usar imágenes propias, con licencia o placeholders mientras no haya autorización. Añadir una nota de proyecto académico no afiliado a las marcas.

## 3. Stack y arquitectura recomendados

### Stack obligatorio/principal

- **Next.js con React y TypeScript** — aplicación web y rutas de servidor Node.js en el mismo proyecto.
- **Supabase Postgres** — persistencia de productos, categorías, simulaciones, eventos y estado del modelo.
- **Supabase Auth** — acceso del administrador al panel, si se implementa autenticación.
- **Supabase Storage** — opcional, para fotografías de productos cargadas legalmente.
- **Vercel** — hosting y despliegue público.
- **GitHub** — repositorio y control de versiones.

Next.js se recomienda porque está basado en React y permite resolver frontend y endpoints de servidor en un mismo repositorio, sin desplegar un servidor Express separado. Confirmar con el docente que Next.js es aceptado como uso de React/Node.js si la consigna restringe expresamente los frameworks.

### Criterio de simplicidad

No añadir servicios, APIs de IA externas, frameworks de ML ni librerías visuales pesadas sin una necesidad clara. El motor de recomendación debe estar implementado en TypeScript puro para que el equipo pueda explicarlo y defenderlo. Se puede usar CSS propio o Tailwind si el equipo ya lo conoce; no introducir varias soluciones de estilos a la vez.

### Capas

1. **Experiencia cliente:** tres menús independientes, carrito, personalizaciones y checkout simulado.
2. **Experiencia de administración:** panel de simulación, configuración de productos, historial y analítica.
3. **Motor adaptativo:** cálculo de elegibilidad, vectorización de contexto, ranking, aprendizaje y explicación.
4. **Persistencia:** Supabase.
5. **Despliegue:** Vercel conectado al repositorio de GitHub.

### Estructura de carpetas orientativa

```text
app/
  (storefront)/
    page.tsx
    dominos/page.tsx
    carls-jr/page.tsx
    degas-cafe/page.tsx
    menu/[brand]/page.tsx
  admin/
    page.tsx
    simulator/page.tsx
    analytics/page.tsx
    products/page.tsx
  api/
    menu/[brand]/route.ts
    recommendations/route.ts
    interactions/route.ts
    simulation/run/route.ts
    simulation/train/route.ts
    model/reset/route.ts
components/
  brands/
    dominos/
    carls-jr/
    degas-cafe/
  menu/
  cart/
  simulator/
  analytics/
lib/
  supabase/
  ai/
    context.ts
    eligibility.ts
    features.ts
    linucb.ts
    rank.ts
    reward.ts
    explain.ts
  validation/
  data/
styles/
supabase/
  migrations/
  seed.sql
  tests/
docs/
```

La estructura es orientativa. Claude debe adaptarla a la estructura real del repositorio y evitar duplicación.

## 4. Producto y experiencias de usuario

### 4.1 Inicio

Página de entrada con tres opciones visuales grandes para entrar a cada experiencia. Debe explicar brevemente que se trata de menús digitales que se adaptan a las condiciones simuladas. Incluir un acceso discreto al panel de administración/simulación.

### 4.2 Menú Domino's Pizza

**Dirección visual:** energética, rápida, contemporánea; predominio de azul y rojo, alto contraste, fotografía amplia de pizzas y bloques que comuniquen tamaños, masas, ingredientes y promociones.

**Estructura funcional:**

- Pizzas de especialidad.
- Arma tu pizza.
- Tamaños y masas.
- Entradas y acompañamientos.
- Alitas/boneless.
- Postres/panecitos.
- Bebidas.
- Promociones/combos.

**Personalización requerida:** tamaño, tipo de masa, cantidad/selección de ingredientes y extras. El precio debe recalcularse desde la configuración del producto; no inventar reglas de precio. Si no se cuenta con una regla verificada, permitir una tabla editable de precios de demostración claramente etiquetada.

**Ejemplos de productos detectados en referencias de Tampico:** Pizza mediana/grande, Pizza Premium, Arma tu Pizza, Extravaganzza, Mexicana, Triple Pepperoni, Papotas, Cheesy Bread, Cheesy Bread Jalapeño, Boneless, Alitas y Baitz. Confirmar disponibilidad y precios antes de declarar el catálogo como oficial.

### 4.3 Menú Carl's Jr.

**Dirección visual:** contundente, urbano, de hamburguesería premium; negro como base con acentos amarillos/rojos, tarjetas de producto con fotografía protagonista, tipografía fuerte y jerarquía visual clara.

**Estructura funcional:**

- Combos de hamburguesas.
- Big Angus.
- Burgers clásicas.
- Pollo.
- Veggie.
- Acompañamientos.
- Postres.
- Bebidas/malteadas.
- Lanzamientos/promociones.

**Personalización requerida:** elegir sencilla/doble cuando aplique, combo o producto individual, tamaño de papas/bebida si el producto lo permite, acompañamiento y bebida. Los modificadores dependen de cada producto, no ofrecer extras genéricos que no estén configurados.

**Ejemplos detectados en el menú local:** Famous Star con Queso, Super Star con Queso, Western Bacon Cheeseburger, Big Carl, Teriyaki Burger, Portobello Mushroom, Guacamole Bacon Burger, Big Angus, El Diablo, Low Carb y Estrellas de Pollo. Verificar cambios de temporada y disponibilidad.

### 4.4 Menú Degas Café

**Dirección visual:** cálida, acogedora, editorial y artesanal; tonos café/espresso, crema y acentos cálidos, fotografía atmosférica, tarjetas menos agresivas y jerarquía de cafetería. No usar la estética de una hamburguesería recoloreada.

**Estructura funcional:**

- Espresso y café caliente.
- Especialidades calientes.
- Café frío.
- Frappés.
- Smoothies.
- Tés, tisanas y chai.
- Paninis.
- Croissants.
- Bisquets/pan.
- Repostería/postres.
- Bebidas frías y agua.

**Personalización requerida:** tamaño, caliente/frío cuando aplique, tipo de leche, shot adicional, jarabes/saborizantes y notas. Solo ofrecer modificadores configurados para el producto.

**Ejemplos detectados en referencias de Tampico:** espresso, americano frío, cappuccino, moka, café Degas frío, frappés (cookies & cream, chocolate, cajeta, coco, moka), smoothies, chai, paninis (europeo, español, boloñés, jamón serrano/tres quesos/suizo), croissants, bisquets, muffins y repostería. Parte de estas referencias proviene de menús de plataformas de terceros o publicaciones de usuarios; validar físicamente la carta vigente antes de marcarla como definitiva.

### 4.5 Componentes compartidos sin uniformar las marcas

Se permite compartir lógica y piezas funcionales —búsqueda, carrito, modal de producto, controles de cantidad, accesibilidad, persistencia— pero cada marca debe tener su propia composición visual, tipografía, navegación, uso de fotografía, color, densidad, microinteracciones y presentación de categorías.

No usar un componente `GenericMenu` que resuelva las tres marcas con un simple `theme` de color. Preferir componentes y layouts por marca que reutilicen solo las piezas funcionales necesarias.

## 5. Requisitos de funcionamiento de cada menú

Todos los menús deben incluir:

- Navegación por categorías y opción de ver todo el menú.
- Búsqueda por nombre o ingrediente.
- Filtros por categoría y, cuando haya datos, características dietéticas/alérgenos.
- Tarjeta con nombre, descripción breve, imagen, precio, etiqueta y estado de disponibilidad.
- Ficha/detalle del producto.
- Personalizaciones válidas por producto.
- Agregar al carrito, cambiar cantidades, editar o eliminar productos.
- Cálculo de subtotal y total con promociones configuradas.
- Resumen de orden y confirmación de checkout simulado.
- Retroalimentación posterior a la compra simulada (por ejemplo, satisfacción de 1 a 5 o pulgar arriba/abajo).
- Diseño responsive; contemplar pantalla horizontal tipo kiosco y móvil.
- Navegación por teclado, foco visible, contraste suficiente y textos accesibles.

El carrito y el checkout no deben desaparecer cuando se actualice una recomendación. Las recomendaciones no pueden cambiar silenciosamente los artículos que ya están en el carrito.

## 6. Panel de simulación

Debe ser un módulo claramente diferenciado del menú público, con controles manuales, estado actual y resultado de la decisión.

### Variables manipulables

| Variable | Control sugerido | Valores |
|---|---|---|
| Marca/sucursal demo | Selector | Domino's, Carl's Jr., Degas Café |
| Hora | Selector/slider | 06:00–23:00 |
| Día | Selector | Lunes–domingo |
| Clima | Selector | Soleado, nublado, lluvioso |
| Temperatura | Slider | 10–40 °C |
| Intensidad de lluvia | Slider | 0–100 %, relevante cuando llueve |
| Fila | Slider | 0–20 autos o clientes según la marca |
| Demanda | Slider | 0–100 |
| Disponibilidad | Controles por producto | Disponible/agotado, stock demo |
| Popularidad reciente | Calculada desde eventos | No control manual por defecto |
| Carrito actual | Simulación de selección | Vacío o con productos elegidos |

En Degas Café la fila puede mostrarse como clientes en espera; en Domino's como órdenes/clientes en preparación o recogida; en Carl's Jr. como autos en fila. Es la misma variable normalizada por debajo, pero el lenguaje de interfaz debe respetar el contexto de la marca.

### Resultado visible al cambiar el escenario

- Menú destacado antes/después.
- Productos recomendados y nuevos lugares en el ranking.
- Etiqueta “Recomendado para este momento”.
- Una explicación sencilla de los factores que influyeron.
- Tiempo de respuesta del motor (medido, no inventado).
- Indicador de si la recomendación proviene del modelo inicial o del modelo entrenado.
- Botón para volver al menú completo.
- Historial de escenarios aplicados.

### Escenarios de demostración precargados

1. **Día caluroso:** 34 °C, soleado, 13:00, fila baja. Es razonable que Degas priorice bebidas frías/frappés y que las bebidas frías aparezcan con mayor prominencia en otros menús donde existan.
2. **Lluvia y tarde fresca:** 20 °C, lluvia alta, 18:00, fila media. Explorar bebidas calientes, café y acompañamientos reconfortantes en Degas; no forzar una asociación universal si el historial no la respalda.
3. **Hora pico:** 20:00, fila alta y demanda alta. Dar preferencia a combos o productos de menor tiempo de preparación **solo si su tiempo está configurado**.
4. **Mañana tranquila:** 08:00, fila baja. Favorecer categorías de desayuno/café donde existan en el catálogo habilitado.
5. **Inventario limitado:** marcar un producto agotado y demostrar que deja de ser elegible sin que la IA lo siga recomendando.

## 7. Motor adaptativo: aprendizaje real y explicable

### 7.1 Enfoque recomendado

Implementar un **contextual bandit LinUCB** por marca. Es una técnica de aprendizaje online para elegir acciones (productos que se muestran con mayor prominencia) considerando el contexto y el resultado observado.

No es un chatbot ni un modelo generativo. Es una forma apropiada de IA predictiva/adaptativa para aprender de interacciones y recomendar productos. No requiere un servicio externo de IA ni entrenamiento pesado.

### 7.2 Flujo de decisión

1. Recibir el contexto actual.
2. Consultar los productos activos de la marca.
3. Aplicar restricciones duras de elegibilidad: activo, disponible, horario válido, canal válido y restricciones de inventario.
4. Construir un vector de características para cada producto y contexto.
5. Calcular puntuación LinUCB por producto.
6. Ajustar por restricciones operativas configuradas (por ejemplo, una penalización de preparación en hora pico).
7. Ordenar productos y devolver ranking, puntuación y explicación.
8. Registrar exposición y eventos posteriores.
9. Cuando exista resultado de la interacción, actualizar el modelo de esa marca.

### 7.3 Vector de contexto y producto

Comenzar con un vector pequeño, consistente y documentado, por ejemplo:

- Sesgo/intercepto.
- Temperatura normalizada.
- Indicador de lluvia.
- Mañana/tarde/noche (codificación one-hot o cíclica).
- Día de la semana o fin de semana.
- Fila normalizada.
- Demanda normalizada.
- Indicador de producto frío.
- Indicador de producto caliente.
- Indicador de producto dulce/postre.
- Indicador de producto salado/comida.
- Indicador de producto de preparación rápida.
- Afinidad con desayuno/comida/cena.
- Compatibilidad con elementos del carrito.

Añadir interacciones contextuales cuando aporten valor, por ejemplo `temperatura × bebida fría`, `lluvia × bebida caliente`, `fila × preparación rápida` y `hora × producto de desayuno`. Mantener el vector de dimensión fija y versionarlo. No cambiar su orden o dimensión sin migrar/reinicializar los modelos existentes.

### 7.4 Fórmula LinUCB

Para cada producto/acción `a`, mantener una matriz `A_a` y un vector `b_a`. Inicialmente:

- `A_a = identidad(d)`
- `b_a = vector de ceros(d)`

Calcular:

- `theta_a = inverse(A_a) × b_a`
- `expectedReward = theta_a · x`
- `uncertainty = sqrt(xᵀ × inverse(A_a) × x)`
- `score = expectedReward + alpha × uncertainty`

`x` es el vector de características del producto y el contexto; `alpha` controla la exploración. Un valor inicial sugerido es `0.25–0.5`, configurable y sujeto a pruebas. La incertidumbre permite explorar alternativas para las que hay poca evidencia.

Al recibir recompensa `r`:

- `A_a = A_a + x × xᵀ`
- `b_a = b_a + r × x`

Implementar operaciones matriciales pequeñas en TypeScript puro, con validación numérica y tests. Si se demuestra que el equipo no puede terminar una implementación matricial estable, se puede reducir temporalmente el vector y el motor, pero **no sustituir el aprendizaje por reglas fijas sin documentarlo**.

### 7.5 Recompensa basada en interacciones

Definir una función de recompensa transparente y ajustable. Valores iniciales de demostración:

| Evento | Recompensa inicial |
|---|---:|
| Recomendación vista (sin selección al cerrar la sesión) | 0.00 |
| Click/ver detalle | +0.10 |
| Agregado al carrito | +0.45 |
| Compra simulada completada | +0.35 |
| Calificación positiva | +0.20 |
| Calificación negativa | -0.25 |
| Producto retirado del carrito | -0.10 |

Normalizar/clamp de recompensa a un rango documentado, por ejemplo `[-1, 1]`. Evitar sumar de forma indiscriminada todos los eventos de una misma sesión y duplicar la recompensa. Definir cómo se combinan los eventos de una acción y cuándo se cierra la observación.

### 7.6 Separar aprendizaje interactivo de tráfico sintético

Deben existir dos fuentes identificables:

- **Interacción de demostración:** las personas que prueban la plataforma hacen clic, agregan al carrito y completan órdenes simuladas.
- **Entrenamiento sintético:** el panel genera sesiones de clientes ficticios para acelerar la demostración del aprendizaje.

Guardar el tipo de origen en cada evento. Permitir filtrar métricas entre `interactive_demo` y `synthetic_batch`. No presentar sesiones sintéticas como clientes reales.

El botón “Simular 50 clientes” debe:

1. Generar contextos realistas dentro de rangos configurados.
2. Simular una respuesta con una distribución controlada por afinidades y contexto, más ruido aleatorio con semilla reproducible.
3. Registrar impresiones, selecciones y resultados.
4. Actualizar el modelo con las recompensas.
5. Mostrar número de eventos, rondas de aprendizaje y métricas antes/después.

La función que simula preferencias debe estar separada del modelo que se evalúa para no confundir el generador de datos con el algoritmo entrenado.

### 7.7 Explicabilidad

Mostrar factores derivados de la puntuación, no frases inventadas. Ejemplos:

- “Subió en el menú porque la temperatura favorece los productos fríos”.
- “Se destacó porque la fila es alta y este producto tiene un tiempo de preparación menor configurado”.
- “Se recomienda como complemento porque coincide con lo que ya agregaste al carrito”.
- “El modelo lo está explorando porque todavía tiene pocos datos en este contexto”.

Incluir un panel “¿Por qué veo esto?” que muestre entre uno y tres factores reales que contribuyeron al ranking. Si el modelo no tiene suficientes datos, indicarlo con honestidad: “Recomendación inicial: todavía estamos aprendiendo”.

### 7.8 Baseline y evaluación

Construir dos modos comparables:

- **Baseline:** orden fijo/popularidad inicial o reglas simples documentadas.
- **Modelo adaptativo:** ranking LinUCB.

Con los mismos escenarios y lotes sintéticos, comparar:

- CTR simulado de productos destacados.
- Tasa de agregado al carrito.
- Conversión simulada.
- Ticket promedio simulado.
- Tiempo de preparación estimado ponderado.
- Diversidad de productos recomendados.

Presentar una comparación antes/después y una curva de recompensa promedio por ronda. No afirmar que mejoró si los resultados de la prueba no lo muestran. Mostrar número de observaciones y permitir reiniciar el modelo.

## 8. Recomendaciones inteligentes adicionales

Además del ranking por contexto, implementar progresivamente:

- **Venta complementaria contextual:** salsa/pan/postre para una pizza; papas/bebida para hamburguesa; panini/postre o bebida complementaria para café. Solo recomendar complementos válidos y configurados.
- **Carrito como contexto:** adaptar sugerencias a lo que la persona ya eligió.
- **Promoción contextual:** mostrar una promoción activa según hora/categoría, sin alterar el precio base ni crear descuentos falsos.
- **Carga operativa:** estimar presión de preparación a partir de fila, demanda y tiempos configurados.
- **Inventario demo:** ocultar o marcar agotado un producto sin que el modelo lo recomiende.

Estas funciones no deben distraer del núcleo del proyecto: menú adaptativo y aprendizaje demostrable.

## 9. Extras priorizados para destacar en la evaluación

### Prioridad A — alto impacto y deben intentarse

1. **Comparador Manual vs. IA:** slider o selector para observar dos versiones del mismo menú bajo el mismo escenario y entender qué cambió.
2. **Panel “Por qué cambió mi menú”:** trazabilidad de los factores que movieron cada producto.
3. **Entrenamiento de clientes simulados:** generar 10/25/50/100 interacciones, ver el progreso del modelo y conservar el resultado.
4. **Analítica de aprendizaje:** CTR, carrito, conversión simulada, recompensa promedio, tiempo de preparación y top productos por escenario.
5. **Recomendaciones complementarias:** cross-selling contextual desde el carrito.
6. **Experiencias propias por marca:** diseño diferenciado, no solo un mismo template con distintos colores.

### Prioridad B — aportan valor real

7. **Gestión de inventario de demostración:** disponibilidad, stock restante y registro de producto agotado.
8. **Filtros de alérgenos y preferencias:** solo cuando se conozca el dato del producto; nunca inferir que un artículo es libre de alérgenos por su nombre.
9. **Modo kiosco:** pantalla completa, botones amplios, navegación simple y temporizador opcional para volver al inicio cuando no hay actividad.
10. **Ticket/recibo digital:** número de orden ficticio, resumen y QR a la orden simulada.
11. **Promociones configurables:** vigencia, marca, horario, condiciones y estado activo.
12. **Control de campañas:** el administrador puede destacar un lanzamiento sin desactivar la recomendación de IA.

### Prioridad C — solo con tiempo suficiente

13. **Diseñador de menú:** activar/desactivar productos, cambiar orden y editar descripciones desde el panel.
14. **Modo accesible:** tamaño de letra alto, contraste, teclado y lectura clara de estados.
15. **Indicador de desperdicio/eficiencia estimada:** únicamente si se agregan datos explícitos de producción; no inventar equivalencias ambientales.
16. **Dashboard multi-sucursal:** no implementar datos reales; permitir perfiles de sucursal ficticios con parámetros distintos.

No implementar todos los extras a costa de dejar incompleto el carrito, el catálogo o el aprendizaje. Es preferible entregar seis funciones excelentes que quince incompletas.

## 10. Modelo de datos sugerido en Supabase

El esquema debe ser relacional, con UUID, timestamps y claves foráneas. Usar `numeric` para precios, nunca `float`.

### `brands`

- `id uuid primary key`
- `slug text unique` (`dominos`, `carls-jr`, `degas-cafe`)
- `name text`
- `description text`
- `theme jsonb`
- `active boolean`
- `created_at timestamptz`

### `categories`

- `id uuid primary key`
- `brand_id uuid references brands`
- `name text`, `slug text`, `sort_order int`, `active boolean`

### `products`

- `id uuid primary key`
- `brand_id uuid references brands`
- `category_id uuid references categories`
- `slug text`, `name text`, `description text`
- `price numeric(10,2)` y `currency text default 'MXN'`
- `image_path text null`
- `tags text[]`
- `dayparts text[]` o disponibilidad estructurada
- `prep_time_seconds int null`
- `is_available boolean`, `is_active boolean`, `stock_demo int null`
- `allergens jsonb null`, `dietary_tags text[]`
- `modifiers jsonb` para opciones específicas por producto
- `price_source text null`, `source_url text null`, `last_verified_at timestamptz null`
- `created_at`, `updated_at`

### `simulation_sessions`

- `id uuid primary key`
- `brand_id uuid references brands`
- `mode text` (`interactive_demo` o `synthetic_batch`)
- `scenario_name text null`
- `context jsonb`
- `created_by uuid null`
- `created_at timestamptz`

### `recommendation_runs`

- `id uuid primary key`
- `session_id uuid references simulation_sessions`
- `brand_id uuid references brands`
- `model_version text`
- `algorithm text`
- `context jsonb`
- `ranked_items jsonb` — IDs, score, posición, razones/contribuciones
- `created_at timestamptz`

### `interaction_events`

- `id uuid primary key`
- `session_id uuid references simulation_sessions`
- `recommendation_run_id uuid references recommendation_runs null`
- `brand_id uuid references brands`
- `product_id uuid references products null`
- `event_type text`
- `source_mode text`
- `reward numeric(6,4) null`
- `event_data jsonb`
- `created_at timestamptz`

### `model_states`

- `id uuid primary key`
- `brand_id uuid unique references brands`
- `algorithm text`
- `model_version text`
- `feature_version int`
- `alpha numeric(8,4)`
- `parameters jsonb` — matrices/vectores por producto
- `training_events int`
- `updated_at timestamptz`

### `orders_demo` y `order_items_demo` (recomendados)

Guardar checkout simulado separado de cualquier orden real. Registrar totales, productos, modificadores y el contexto bajo el cual se generó la recomendación. Añadir `is_simulated boolean default true` si se desea hacer explícita la distinción en cada registro.

### Seguridad / RLS

- Habilitar Row Level Security en todas las tablas expuestas.
- Los visitantes solo pueden leer marcas, categorías y productos activos.
- Las escrituras de eventos y órdenes pasan por endpoints de servidor con validación; evitar exponer privilegios de administración al navegador.
- Las acciones de administración requieren usuario autenticado y rol permitido.
- El estado del modelo solo se modifica desde el servidor.
- Crear pruebas de políticas para lecturas/escrituras permitidas y denegadas.
- Revisar grants además de policies: activar RLS por sí solo no sustituye una configuración correcta de privilegios.

## 11. API / operaciones de servidor

Crear Route Handlers con validación estricta y respuestas tipadas. Nombres sugeridos:

- `GET /api/menu/[brand]` — devuelve categorías/productos públicos activos.
- `POST /api/recommendations` — recibe marca y contexto; devuelve ranking y explicaciones.
- `POST /api/interactions` — registra evento validado.
- `POST /api/simulation/run` — crea/ejecuta un escenario.
- `POST /api/simulation/train` — ejecuta lote sintético de N clientes (con límites).
- `POST /api/model/reset` — reinicia modelo demo de la marca, protegido para administración.
- `GET /api/analytics/[brand]` — métricas agregadas.

No aceptar del cliente un `reward` arbitrario sin validar el evento que lo justifica. Limitar el tamaño de lotes sintéticos y evitar que una solicitud pública pueda generar un volumen ilimitado de registros.

## 12. Panel de administración y analítica

El panel debe organizarse en secciones:

1. **Resumen:** estado de las tres marcas, interacciones simuladas, recomendaciones, conversión demo y última actualización del modelo.
2. **Simulador:** marca, clima, temperatura, hora, fila, demanda, inventario y carrito.
3. **Comparador:** baseline frente a IA para el mismo contexto.
4. **Entrenamiento:** generar N sesiones sintéticas, seleccionar semilla, ver progreso, cancelar o reiniciar de forma controlada.
5. **Analítica:** resultados por marca, escenario, origen de eventos y producto.
6. **Catálogo:** editar precios de demostración, productos, categorías, disponibilidad y parámetros de preparación.
7. **Historial:** consultar ejecuciones y explicaciones pasadas.

Gráficas simples propias (SVG/CSS) son suficientes. Los gráficos deben tener títulos, unidades, leyendas y estados vacíos.

## 13. Seguridad, privacidad y calidad

- No solicitar datos personales de clientes para el proyecto.
- No implementar reconocimiento facial, matrículas, geolocalización ni perfiles sensibles.
- No discriminar ni variar precios por persona.
- Sanitizar y validar inputs del panel y endpoints.
- Manejar errores de Supabase y estados de carga/vacío.
- No usar `service_role`/secret key en componentes cliente.
- Proteger rutas administrativas.
- Añadir límites para lotes sintéticos y eventos.
- Registrar timestamps en UTC y presentar la hora del simulador de manera explícita.
- Usar `numeric` para dinero y formatear con `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })`.
- Añadir pruebas unitarias del algoritmo, elegibilidad, recompensa, personalizaciones y cálculo de total.
- Añadir pruebas de integración para endpoints y políticas RLS.
- Verificar diseño en móvil, escritorio y pantalla tipo kiosco.

## 14. Criterios de aceptación

El proyecto se considera presentable cuando se cumpla todo lo siguiente:

### Experiencia

- [ ] Se puede entrar a cada una de las tres marcas desde la página principal.
- [ ] Cada marca tiene identidad visual diferenciada y un catálogo coherente.
- [ ] Se puede buscar, filtrar, consultar y personalizar productos.
- [ ] Se puede agregar, editar y quitar productos del carrito.
- [ ] El total se calcula correctamente y el checkout es simulado.
- [ ] El menú sigue siendo utilizable cuando cambia el contexto.

### Simulación e IA

- [ ] El panel cambia clima, temperatura, hora, fila y demanda.
- [ ] El cambio de contexto produce un nuevo ranking.
- [ ] El usuario puede ver qué productos subieron/bajaron y por qué.
- [ ] El motor incluye aprendizaje online, no solo reglas fijas.
- [ ] El entrenamiento sintético actualiza el estado del modelo en Supabase.
- [ ] Al recargar, el modelo conserva el aprendizaje.
- [ ] Se pueden comparar baseline e IA con el mismo escenario.
- [ ] Los resultados sintéticos están claramente etiquetados como simulados.
- [ ] Un producto agotado nunca aparece como recomendación disponible.

### Tecnología y entrega

- [ ] El repositorio está en GitHub y tiene instrucciones de instalación.
- [ ] El despliegue público funciona en Vercel.
- [ ] Las variables de entorno están configuradas fuera del repositorio.
- [ ] RLS está habilitado y probado.
- [ ] `npm run build` pasa sin errores.
- [ ] No existen secretos, errores críticos de consola ni rutas rotas.

## 15. Plan de trabajo por fases

Claude debe implementar de forma incremental y probar cada fase antes de continuar.

**Fase 0 — Inspección y definición:** inspeccionar repositorio, stack existente, dependencias y estado. Crear checklist y documentar cualquier conflicto con este archivo.

**Fase 1 — Base técnica:** configurar Next.js/React/TypeScript, Supabase clients, variables, layout y navegación; crear migraciones y seed inicial.

**Fase 2 — Menús:** terminar primero un flujo completo por marca, con categorías, producto, modificadores, carrito y checkout simulado. No pasar a analítica hasta que el flujo funcione.

**Fase 3 — Simulador:** controles de contexto, escenarios predefinidos, ejecución y vista antes/después.

**Fase 4 — Motor LinUCB:** elegibilidad, vector de características, ranking, recompensas, persistencia y explicación; cubrir con tests.

**Fase 5 — Aprendizaje sintético:** generador de clientes simulados separado del modelo, entrenamiento por lotes y persistencia.

**Fase 6 — Dashboard:** baseline vs IA, métricas, curva de aprendizaje, historial y catálogo administrable.

**Fase 7 — Pulido:** accesibilidad, responsive, modo kiosco, extras Prioridad A, rendimiento y pruebas.

**Fase 8 — Entrega:** README, guía de despliegue, variables, configuración Supabase, pruebas y conexión GitHub–Vercel.

## 16. Instrucciones de trabajo para Claude

1. Leer este archivo y revisar cualquier documentación existente antes de escribir código.
2. Inspeccionar `package.json`, estructura, dependencias, configuración de Next.js y estado Git.
3. Si el repositorio ya tiene código, conservar componentes y decisiones útiles; no sobrescribir archivos sin entender su propósito.
4. Proponer primero un plan corto con archivos que se crearán/modificarán y riesgos técnicos detectados.
5. Implementar por fases funcionales. No dejar botones decorativos o controles sin acción.
6. No simular persistencia con `localStorage` como sustituto permanente de Supabase. Puede usarse temporalmente para prototipos, pero la entrega debe persistir en Supabase.
7. No fingir que una IA externa o un entrenamiento ocurrió. El motor debe ser ejecutable, reproducible y auditable.
8. No inventar precios, productos, fotos, alergénos ni promociones. Si un dato no está confirmado, marcarlo como demo/pendiente de validación.
9. Escribir migraciones SQL versionadas; no depender de cambios manuales irreproducibles en el dashboard.
10. Al finalizar cada fase, ejecutar los tests y el build que existan; corregir errores antes de avanzar.
11. Cuando falte una credencial externa, crear la integración y documentar exactamente la variable necesaria, sin inventar credenciales.
12. Mantener nombres de variables y tipos coherentes entre frontend, rutas de servidor y base de datos.
13. Entregar al final un resumen de lo implementado, decisiones pendientes, pasos para correr localmente, configuración de Supabase y despliegue Vercel.

---

## 17. Investigación y fuentes base

**Consulta documental: 2 de noviembre de 2026.** Los menús y precios pueden variar por sucursal, canal, horario, promoción y fecha. La lista que sigue sirve como punto de partida para el catálogo demo, no como garantía de disponibilidad nacional.

### Caso McDonald's / Dynamic Yield

- McDonald's anunció el 25 de marzo de 2019 la adquisición de Dynamic Yield y explicó que la tecnología podría variar los menús digitales de Drive-Thru por hora, clima, tráfico actual del restaurante y productos populares; además, podría sugerir complementos según la orden. La empresa indicó que ya había probado la tecnología en algunos restaurantes de EE. UU. en 2018 y que comenzaría el despliegue en EE. UU. durante 2019. Esto no demuestra que todos los restaurantes del mundo cambiaran su menú desde ese año.
- Mastercard publicó posteriormente que los algoritmos y estrategias de recomendación se probaban y optimizaban de manera continua y que el despliegue de Dynamic Yield se había escalado a múltiples mercados.

Fuentes:
- https://corporate.mcdonalds.com/corpmcd/our-stories/article/dynamic_yield.html
- https://www.mastercard.com/global/en/news-and-trends/Insights/2023/mcdonalds.html

### Domino's Pizza — referencias de Tampico

Una ficha de Domino's en Tampico consultada en Uber Eats muestra productos como Pizza Mediana/Grande, opciones de personalización, Extravaganzza, Mexicana, Triple Pepperoni, Papotas, Cheesy Bread, Boneless, Alitas y promociones. Los precios visibles en la plataforma pueden ser distintos a tienda o a otra sucursal.

Fuentes:
- https://www.ubereats.com/mx/store/dominos-tampico/_yXy0S7LRdeHMDAo9ZnDKA
- https://www.rappi.com.mx/restaurantes/1923746350-dominos-pizza
- Referencia visual de menú digital: https://menudigital.wowrewards.mx/dom/15/

### Carl's Jr. — referencia local

El sitio de pedidos `carlsjrtampico.com` muestra categorías específicas: combos burgers, combos Big Angus, pollo, infantiles, lanzamientos, burgers, veggie, acompañamientos, postres y bebidas. Entre los ejemplos visibles están Famous Star con Queso, Super Star con Queso, Western Bacon Cheeseburger, Big Angus y El Diablo. Los precios publicados son locales y deben administrarse como datos editables.

Fuentes:
- https://carlsjrtampico.com/
- https://carlsjrtampico.com/Menu
- https://carlsjrtampico.com/Menu/SubMenu/3
- https://carlsjrtampico.com/Menu/SubMenu/14
- Sitio general de la marca: https://carlsjr.com.mx/

### Degas Café — referencias locales

Las fuentes públicas encontradas están más fragmentadas. Una ficha de Uber Eats de Degas Café Sucursal Armas en Tampico incluye paninis, croissants, bisquets, muffins, repostería, espresso, especialidades frías, frappés, smoothies, tés, chai y otras bebidas. La ficha indica que dejó de operar en Uber Eats desde el 21 de julio de 2025; por tanto, sirve como evidencia histórica de variedad, no como validación de disponibilidad actual. Una ficha de Plaza Herradura muestra categorías generales de postres, bebidas frías, chai, café, empanadas y cappuccino.

Fuentes:
- https://www.ubereats.com/mx/store/degas-cafe-sucursal-armas/REUAyRFiQmCQ8vBsNXgVmA
- https://carta.menu/restaurants/tampico/degas-cafe-plaza-herradura
- https://es.restaurantguru.com/Degas-Cafe-Zona-Centro-Tampico-Tampico/menu

### Documentación técnica

- Supabase SSR y clientes para Next.js: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Next.js Route Handlers: https://nextjs.org/docs/app/getting-started/route-handlers
- Vercel deployments y Git: https://vercel.com/docs/deployments
- Vercel environments: https://vercel.com/docs/deployments/environments

