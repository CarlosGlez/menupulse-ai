# MenuPulse AI

Demostración académica de **menús digitales adaptativos** para tres marcas (Domino's Pizza, Carl's Jr. y Degas Café) con un motor de aprendizaje contextual **LinUCB** en TypeScript puro.

> Proyecto académico **no afiliado** a las marcas. Precios, tiempos de preparación, stock, órdenes y métricas son **datos simulados/demo**.

La especificación completa está en [`CLAUDE.md`](./CLAUDE.md) y el avance por fases en [`docs/PROGRESO.md`](./docs/PROGRESO.md).

## Requisitos

- Node.js 20 o superior
- Un proyecto de Supabase (gratuito)

## Correr en local

```bash
npm install
cp .env.example .env.local   # llena los valores (ver abajo)
npm run dev                  # http://localhost:3000
```

Si `.env.local` no tiene las credenciales de Supabase, la app arranca en **modo memoria**: funciona para probar, pero **no guarda nada** al reiniciar el servidor.

## Configurar Supabase

1. En el dashboard de Supabase abre **SQL Editor**, pega el contenido completo de `supabase/setup_sql_editor.sql` y ejecútalo. Crea las tablas y las funciones de analítica, activa RLS y carga el catálogo demo. Se puede volver a ejecutar sobre un proyecto vacío; si ya lo corriste antes, ejecuta solo los archivos nuevos de `supabase/migrations/`.
2. (Opcional) Ejecuta `supabase/tests/rls_test.sql` en el mismo editor. Debe terminar con `RLS OK` y no deja cambios.
3. En **Project Settings → API** copia estos valores a `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`: la Project URL.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: la publishable/anon key.
   - `SUPABASE_SECRET_KEY`: la secret/service_role key. **Solo va en el servidor; nunca le pongas el prefijo `NEXT_PUBLIC_`.**
4. Define `ADMIN_ACCESS_CODE`, el código para entrar al panel de simulación y entrenamiento.

Si cambias el catálogo en `lib/data/catalog.ts`, regenera el seed con `npm run seed:generate`.

## Recorrido para la presentación

1. Entra a `/admin` con tu `ADMIN_ACCESS_CODE`. Ahí está el **Resumen** de las tres marcas.
2. **Simulador:** elige Degas Café, aplica "Día caluroso" y observa el ranking. Con el modelo nuevo dice "modelo inicial".
3. **Entrenamiento:** simula 5 lotes de 200 clientes. Revisa la tabla menú fijo / IA antes / IA después y la curva de aprendizaje.
4. Vuelve al **Simulador** y aplica "Día caluroso" otra vez: ahora suben los frappés y bebidas frías. Abre los motivos de cada producto.
5. Aplica "Lluvia y tarde fresca": suben chai, espresso y cappuccino.
6. Aplica "Inventario limitado": el producto agotado desaparece del ranking. Reactívalo en **Catálogo e inventario**.
7. **Manual vs. IA:** compara el mismo escenario con y sin IA.
8. Abre un menú, haz una orden simulada y califícala. En **Analítica → Demo interactiva** aparece la orden, y el modelo se actualiza con esa visita.
9. Recarga la página. Con Supabase configurado, todo lo aprendido sigue ahí.

Modo kiosco: `/?kiosco=1`. Usa letra y botones más grandes, tiene botón de pantalla completa y regresa solo al inicio tras 90 s sin actividad.

## Desplegar en Vercel

1. Sube el proyecto a un repositorio de GitHub. `.env.local` no se sube porque está en `.gitignore`.
2. En Vercel: **Add New → Project**, importa el repositorio. Vercel detecta Next.js solo; no cambies los comandos.
3. En **Settings → Environment Variables** agrega `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` y `ADMIN_ACCESS_CODE`, para Production y Preview.
4. Pulsa **Deploy**. Cada `git push` a la rama principal vuelve a desplegar.
5. Si agregas variables después del primer despliegue, haz **Redeploy** para que las tome.

En producción, si falta `ADMIN_ACCESS_CODE`, el panel queda cerrado; no se abre sin código.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm test` | Tests del motor (LinUCB, recompensa, elegibilidad, aprendizaje) |
| `npm run lint` | ESLint |
| `npm run seed:generate` | Regenera `supabase/seed.sql` y `supabase/setup_sql_editor.sql` |

## Cómo funciona el motor (resumen)

1. **Elegibilidad:** un producto inactivo, agotado, sin stock o fuera de horario nunca se recomienda.
2. **Vector de contexto (10 dimensiones, versión 1):** sesgo, temperatura, lluvia, mañana, noche, fin de semana, noche de fin de semana, fila, demanda y compatibilidad con el carrito.
3. **LinUCB disjunto:** cada producto tiene su propio `A` y `b`, y su puntuación es `score = θ·x + α·√(xᵀA⁻¹x)`.
4. **Ajuste operativo:** en hora pico se penalizan los productos con tiempo de preparación alto, solo si ese tiempo está configurado.
5. **Recompensa:** clic +0.10, carrito +0.45, compra +0.35, calificación +0.20/−0.25, retirado −0.10. Cada tipo cuenta una vez por observación y el total se limita a [−1, 1].
6. **Explicación:** se muestran las contribuciones reales `θᵢ·xᵢ` que más pesaron en la puntuación.
7. **Clientes simulados:** viven en `lib/ai/synthetic.ts`, separados del modelo. Tienen una preferencia oculta que el modelo no conoce y solo puede descubrir con las recompensas.

## API

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/menu/[brand]` | público |
| POST | `/api/recommendations` | público |
| POST | `/api/interactions` | público (valida que el producto pertenezca a la recomendación; no acepta `reward` del cliente) |
| POST | `/api/observations/close` | público, idempotente: actualiza el modelo una sola vez |
| POST | `/api/simulation/train` | admin, máximo 200 clientes por lote |
| POST | `/api/model/reset` | admin, requiere `confirm: true` |
| GET | `/api/model/[brand]` | admin |
| PATCH | `/api/products/[id]/availability` | admin |
| POST | `/api/orders` | público (recalcula precios en servidor) |
| POST | `/api/orders/feedback` | público, una sola calificación por orden |
| GET | `/api/analytics/[brand]` | admin |
| GET | `/api/history/[brand]` | admin |
| POST | `/api/admin/login` · `/api/admin/logout` | crea o borra la cookie de admin (guarda un hash, no el código) |
