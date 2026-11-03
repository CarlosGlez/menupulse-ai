# Inventario inicial de productos y criterios de validación

Este documento sirve para poblar el primer catálogo de demostración. No debe tratarse como una lista nacional, completa ni permanentemente vigente.

## Reglas para cargar el catálogo

Cada producto debe incluir al menos:

- Marca y categoría.
- Nombre y descripción corta.
- Precio de demostración (o `null` hasta validarlo).
- Fuente del dato y fecha de consulta.
- Disponibilidad editable.
- Etiquetas contextuales necesarias para la IA.
- Tiempo de preparación editable, cuando se tenga una estimación válida.
- Modificadores posibles.
- Imagen propia, con licencia o placeholder.

No cargar como real un precio observado en una aplicación de entrega. Etiquetar ese valor como referencia de plataforma, localidad y fecha.

## Domino's Pizza

**Categorías:** pizzas de especialidad, arma tu pizza, entradas, alitas/boneless, postres/panecitos, bebidas y promociones.

**Productos iniciales para revisar:** Pizza Mediana, Pizza Grande, Pizza Premium, Arma tu Pizza 1 ingrediente, Arma tu Pizza 2–4 ingredientes, Extravaganzza, Mexicana, Triple Pepperoni, Papotas, Cheesy Bread, Cheesy Bread Jalapeño, Boneless, Alitas, Cajeta Baitz, Canela Baitz.

**Modificadores:** tamaño, masa, ingredientes, extras, salsa. Definir reglas de costo según la configuración editable de cada sucursal demo.

**Etiquetas IA sugeridas:** `savory`, `shareable`, `family`, `quick_option` (solo si el tiempo configurado lo justifica), `spicy`, `cheese`, `dessert`, `cold_drink`.

**Fuente de referencia local:** https://www.ubereats.com/mx/store/dominos-tampico/_yXy0S7LRdeHMDAo9ZnDKA

## Carl's Jr.

**Categorías:** combos burgers, Big Angus, burgers, pollo, veggie, acompañamientos, postres, bebidas y lanzamientos.

**Productos iniciales para revisar:** Famous Star con Queso, Super Star con Queso, Western Bacon Cheeseburger, Double Western Bacon Cheeseburger, Teriyaki Burger, Portobello Mushroom, Classic Burger, The Big Carl, Guacamole Bacon Burger, Original Big Angus, Guacamole Bacon Big Angus, Western Bacon Big Angus, Low Carb Big Angus, El Diablo Big Angus, Estrellas de Pollo.

**Modificadores:** sencilla/doble cuando aplique, combo, tamaño de papas/bebida y extras específicos. No ofrecer todas las variantes a todos los productos.

**Etiquetas IA sugeridas:** `savory`, `grilled`, `spicy`, `vegetarian_option`, `combo`, `shareable`, `cold_drink`, `dessert`.

**Fuentes locales:**
- https://carlsjrtampico.com/
- https://carlsjrtampico.com/Menu/SubMenu/3
- https://carlsjrtampico.com/Menu/SubMenu/14

## Degas Café

**Categorías:** espresso/café caliente, especialidades calientes, café frío, frappés, smoothies, té/tisanas/chai, paninis, croissants, bisquets/pan, repostería y bebidas frías.

**Productos iniciales para validar con una carta vigente:** espresso, espresso cortado, americano, café Degas frío, cappuccino, moka, frappé de cookies & cream, chocolate, cajeta, coco, moka frappé, smoothie, chai, panini europeo, panini español, panini boloñés, panini de jamón serrano, panini tres quesos, panini suizo, croissant de jamón con queso, croissant de pollo, muffin, pay tortuga, pay de queso con fresas, pan de elote y pay de limón.

**Modificadores:** tamaño, caliente/frío, leche, shot adicional, jarabe/sabor, hielo y notas; limitar cada modificación a productos compatibles.

**Etiquetas IA sugeridas:** `hot_drink`, `cold_drink`, `coffee`, `tea`, `sweet`, `savory`, `breakfast`, `dessert`, `comfort`, `quick_option` (solo si hay tiempo configurado).

**Fuentes de referencia local:**
- https://www.ubereats.com/mx/store/degas-cafe-sucursal-armas/REUAyRFiQmCQ8vBsNXgVmA
- https://carta.menu/restaurants/tampico/degas-cafe-plaza-herradura

La ficha de Uber Eats de Sucursal Armas indica que dejó de operar en la plataforma desde el 21 de julio de 2025. Sus productos son una referencia histórica que debe verificarse antes de usarse como carta vigente.

## Atributos de contexto para el motor

Usar un vocabulario consistente para etiquetar productos. Evitar etiquetas ambiguas sin significado operacional. Ejemplo:

```json
{
  "tags": ["cold_drink", "sweet", "coffee"],
  "dayparts": ["morning", "afternoon", "evening"],
  "prepTimeSeconds": 180,
  "isAvailable": true,
  "stockDemo": 20
}
```

`prepTimeSeconds` y `stockDemo` son valores de simulación cuando no exista información real; deben marcarse y poder editarse desde el panel.
