// Catálogo DEMO inicial. Fuente única para el seed SQL y para el modo local sin Supabase.
//
// IMPORTANTE: los productos provienen de las referencias listadas en docs/INVENTARIO_BASE_Y_NOTAS.md
// (consultadas el 2 de noviembre de 2026). Los PRECIOS, tiempos de preparación, stock y
// modificadores son valores de DEMOSTRACIÓN: no son precios oficiales de las marcas.
// Las descripciones son textos genéricos de demo, pendientes de validar con la carta vigente.

import { stableUuid } from "./ids";
import type {
  Brand,
  BrandSlug,
  Category,
  Daypart,
  MenuData,
  ModifierGroup,
  Product,
  ProductTag,
} from "../types";

export const DEMO_PRICE_SOURCE = "demo_no_oficial";

const ALL_DAY: Daypart[] = ["morning", "afternoon", "evening"];
const LUNCH_DINNER: Daypart[] = ["afternoon", "evening"];

export const BRANDS: Brand[] = [
  {
    id: stableUuid("brand:dominos"),
    slug: "dominos",
    name: "Domino's Pizza",
    description: "Pizzería — experiencia demo, no afiliada a la marca.",
    queueLabel: "órdenes en preparación",
  },
  {
    id: stableUuid("brand:carls-jr"),
    slug: "carls-jr",
    name: "Carl's Jr.",
    description: "Hamburguesería — experiencia demo, no afiliada a la marca.",
    queueLabel: "autos en fila",
  },
  {
    id: stableUuid("brand:degas-cafe"),
    slug: "degas-cafe",
    name: "Degas Café",
    description: "Cafetería — experiencia demo, no afiliada a la marca.",
    queueLabel: "clientes en espera",
  },
];

const CATEGORY_DEFS: Record<BrandSlug, [string, string][]> = {
  dominos: [
    ["especialidades", "Pizzas de especialidad"],
    ["arma-tu-pizza", "Arma tu pizza"],
    ["entradas", "Entradas y acompañamientos"],
    ["alitas-boneless", "Alitas y boneless"],
    ["postres", "Postres y panecitos"],
    ["bebidas", "Bebidas"],
  ],
  "carls-jr": [
    ["combos", "Combos de hamburguesas"],
    ["big-angus", "Big Angus"],
    ["burgers", "Burgers clásicas"],
    ["pollo", "Pollo"],
    ["veggie", "Veggie"],
    ["acompanamientos", "Acompañamientos"],
    ["postres", "Postres"],
    ["bebidas", "Bebidas y malteadas"],
  ],
  "degas-cafe": [
    ["cafe-caliente", "Espresso y café caliente"],
    ["cafe-frio", "Café frío"],
    ["frappes", "Frappés"],
    ["smoothies", "Smoothies"],
    ["tes", "Tés y chai"],
    ["paninis", "Paninis"],
    ["croissants", "Croissants"],
    ["reposteria", "Repostería y pan"],
  ],
};

function brandBySlug(slug: BrandSlug): Brand {
  const b = BRANDS.find((x) => x.slug === slug);
  if (!b) throw new Error(`Marca desconocida: ${slug}`);
  return b;
}

export const CATEGORIES: Category[] = BRANDS.flatMap((brand) =>
  CATEGORY_DEFS[brand.slug].map(([slug, name], i) => ({
    id: stableUuid(`category:${brand.slug}:${slug}`),
    brandId: brand.id,
    slug,
    name,
    sortOrder: i + 1,
  })),
);

// ---------- Modificadores DEMO reutilizables por marca ----------

const pizzaModifiers: ModifierGroup[] = [
  {
    id: "tamano",
    label: "Tamaño",
    type: "single",
    required: true,
    defaultOptionId: "mediana",
    options: [
      { id: "mediana", label: "Mediana", priceDelta: 0 },
      { id: "grande", label: "Grande", priceDelta: 60 },
    ],
  },
  {
    id: "masa",
    label: "Masa",
    type: "single",
    required: true,
    defaultOptionId: "original",
    options: [
      { id: "original", label: "Original", priceDelta: 0 },
      { id: "delgada", label: "Delgada", priceDelta: 0 },
      { id: "orilla-rellena", label: "Orilla rellena de queso", priceDelta: 35 },
    ],
  },
  {
    id: "extras",
    label: "Ingredientes extra",
    type: "multi",
    required: false,
    max: 4,
    options: [
      { id: "pepperoni", label: "Pepperoni", priceDelta: 20 },
      { id: "jamon", label: "Jamón", priceDelta: 20 },
      { id: "champinones", label: "Champiñones", priceDelta: 20 },
      { id: "jalapeno", label: "Jalapeño", priceDelta: 20 },
      { id: "extra-queso", label: "Extra queso", priceDelta: 25 },
    ],
  },
];

const buildYourPizzaModifiers: ModifierGroup[] = [
  pizzaModifiers[0],
  pizzaModifiers[1],
  {
    id: "ingredientes",
    label: "Ingredientes",
    type: "multi",
    required: true,
    max: 4,
    options: [
      { id: "pepperoni", label: "Pepperoni", priceDelta: 0 },
      { id: "jamon", label: "Jamón", priceDelta: 0 },
      { id: "champinones", label: "Champiñones", priceDelta: 0 },
      { id: "pimiento", label: "Pimiento", priceDelta: 0 },
      { id: "cebolla", label: "Cebolla", priceDelta: 0 },
      { id: "jalapeno", label: "Jalapeño", priceDelta: 0 },
      { id: "pina", label: "Piña", priceDelta: 0 },
    ],
  },
];

const wingsModifiers: ModifierGroup[] = [
  {
    id: "salsa",
    label: "Salsa",
    type: "single",
    required: true,
    defaultOptionId: "bbq",
    options: [
      { id: "bbq", label: "BBQ", priceDelta: 0 },
      { id: "bufalo", label: "Búfalo", priceDelta: 0 },
      { id: "mango-habanero", label: "Mango habanero", priceDelta: 0 },
    ],
  },
];

const sodaSize: ModifierGroup = {
  id: "tamano-bebida",
  label: "Tamaño",
  type: "single",
  required: true,
  defaultOptionId: "mediano",
  options: [
    { id: "mediano", label: "Mediano", priceDelta: 0 },
    { id: "grande", label: "Grande", priceDelta: 10 },
  ],
};

function burgerModifiers(opts: { double?: boolean }): ModifierGroup[] {
  const groups: ModifierGroup[] = [];
  if (opts.double) {
    groups.push({
      id: "carne",
      label: "Carne",
      type: "single",
      required: true,
      defaultOptionId: "sencilla",
      options: [
        { id: "sencilla", label: "Sencilla", priceDelta: 0 },
        { id: "doble", label: "Doble", priceDelta: 40 },
      ],
    });
  }
  groups.push(
    {
      id: "presentacion",
      label: "Presentación",
      type: "single",
      required: true,
      defaultOptionId: "individual",
      options: [
        { id: "individual", label: "Solo la burger", priceDelta: 0 },
        { id: "combo", label: "Combo (papas + bebida)", priceDelta: 65 },
      ],
    },
    {
      id: "tamano-combo",
      label: "Tamaño del combo",
      type: "single",
      required: true,
      defaultOptionId: "mediano",
      dependsOn: { groupId: "presentacion", optionId: "combo" },
      options: [
        { id: "mediano", label: "Mediano", priceDelta: 0 },
        { id: "grande", label: "Grande", priceDelta: 20 },
      ],
    },
    {
      id: "bebida-combo",
      label: "Bebida del combo",
      type: "single",
      required: true,
      defaultOptionId: "refresco",
      dependsOn: { groupId: "presentacion", optionId: "combo" },
      options: [
        { id: "refresco", label: "Refresco", priceDelta: 0 },
        { id: "te-helado", label: "Té helado", priceDelta: 0 },
        { id: "agua", label: "Agua natural", priceDelta: 0 },
      ],
    },
  );
  return groups;
}

const friesSize: ModifierGroup = {
  id: "tamano-papas",
  label: "Tamaño",
  type: "single",
  required: true,
  defaultOptionId: "mediana",
  options: [
    { id: "chica", label: "Chica", priceDelta: -10 },
    { id: "mediana", label: "Mediana", priceDelta: 0 },
    { id: "grande", label: "Grande", priceDelta: 12 },
  ],
};

const coffeeSize: ModifierGroup = {
  id: "tamano",
  label: "Tamaño",
  type: "single",
  required: true,
  defaultOptionId: "chico",
  options: [
    { id: "chico", label: "Chico", priceDelta: 0 },
    { id: "grande", label: "Grande", priceDelta: 15 },
  ],
};
const milk: ModifierGroup = {
  id: "leche",
  label: "Leche",
  type: "single",
  required: true,
  defaultOptionId: "entera",
  options: [
    { id: "entera", label: "Entera", priceDelta: 0 },
    { id: "deslactosada", label: "Deslactosada", priceDelta: 0 },
    { id: "almendra", label: "Almendra", priceDelta: 10 },
  ],
};
const extraShot: ModifierGroup = {
  id: "shot",
  label: "Shot adicional",
  type: "multi",
  required: false,
  max: 1,
  options: [{ id: "shot-extra", label: "Shot extra de espresso", priceDelta: 12 }],
};
const syrup: ModifierGroup = {
  id: "jarabe",
  label: "Jarabe",
  type: "multi",
  required: false,
  max: 1,
  options: [
    { id: "vainilla", label: "Vainilla", priceDelta: 10 },
    { id: "caramelo", label: "Caramelo", priceDelta: 10 },
  ],
};
const espressoMods = [coffeeSize, extraShot, syrup];
const milkCoffeeMods = [coffeeSize, milk, extraShot, syrup];

// ---------- Definición compacta de productos ----------

interface P {
  slug: string;
  name: string;
  cat: string;
  desc: string;
  price: number | null;
  tags: ProductTag[];
  dayparts?: Daypart[];
  prep?: number | null;
  stock?: number | null;
  dietary?: string[];
  mods?: ModifierGroup[];
  complements?: string[];
}

const DOMINOS_URL = "https://www.ubereats.com/mx/store/dominos-tampico/_yXy0S7LRdeHMDAo9ZnDKA";
const CARLS_URL = "https://carlsjrtampico.com/Menu";
const DEGAS_URL = "https://www.ubereats.com/mx/store/degas-cafe-sucursal-armas/REUAyRFiQmCQ8vBsNXgVmA";

const PRODUCT_DEFS: Record<BrandSlug, { url: string; items: P[] }> = {
  dominos: {
    url: DOMINOS_URL,
    items: [
      { slug: "extravaganzza", name: "Extravaganzza", cat: "especialidades", desc: "Pizza de especialidad con varios ingredientes cárnicos y vegetales.", price: 239, tags: ["savory", "shareable", "family", "cheese"], dayparts: LUNCH_DINNER, prep: 900, mods: pizzaModifiers, complements: ["entradas", "bebidas", "postres"] },
      { slug: "mexicana", name: "Mexicana", cat: "especialidades", desc: "Pizza de especialidad de estilo mexicano con toque picante.", price: 229, tags: ["savory", "shareable", "spicy", "cheese"], dayparts: LUNCH_DINNER, prep: 900, mods: pizzaModifiers, complements: ["entradas", "bebidas", "postres"] },
      { slug: "triple-pepperoni", name: "Triple Pepperoni", cat: "especialidades", desc: "Pizza con triple porción de pepperoni.", price: 229, tags: ["savory", "shareable", "cheese"], dayparts: LUNCH_DINNER, prep: 840, mods: pizzaModifiers, complements: ["entradas", "bebidas", "postres"] },
      { slug: "pizza-premium", name: "Pizza Premium", cat: "especialidades", desc: "Selección de pizzas premium de la casa.", price: 259, tags: ["savory", "shareable", "family", "cheese"], dayparts: LUNCH_DINNER, prep: 960, mods: pizzaModifiers, complements: ["entradas", "bebidas"] },
      { slug: "arma-tu-pizza", name: "Arma tu Pizza", cat: "arma-tu-pizza", desc: "Elige tamaño, masa y de 1 a 4 ingredientes.", price: 189, tags: ["savory", "shareable", "cheese"], dayparts: LUNCH_DINNER, prep: 900, mods: buildYourPizzaModifiers, complements: ["entradas", "bebidas"] },
      { slug: "papotas", name: "Papotas", cat: "entradas", desc: "Papas sazonadas para acompañar.", price: 79, tags: ["savory", "side", "shareable"], dayparts: LUNCH_DINNER, prep: 480, complements: ["bebidas"] },
      { slug: "cheesy-bread", name: "Cheesy Bread", cat: "entradas", desc: "Pan horneado con queso gratinado.", price: 89, tags: ["savory", "side", "cheese", "shareable"], dayparts: LUNCH_DINNER, prep: 540, complements: ["bebidas"] },
      { slug: "cheesy-bread-jalapeno", name: "Cheesy Bread Jalapeño", cat: "entradas", desc: "Pan horneado con queso y jalapeño.", price: 95, tags: ["savory", "side", "cheese", "spicy"], dayparts: LUNCH_DINNER, prep: 540, complements: ["bebidas"] },
      { slug: "boneless", name: "Boneless", cat: "alitas-boneless", desc: "Trozos de pollo empanizado con salsa a elegir.", price: 129, tags: ["savory", "shareable", "spicy"], dayparts: LUNCH_DINNER, prep: 600, mods: wingsModifiers, complements: ["bebidas"] },
      { slug: "alitas", name: "Alitas", cat: "alitas-boneless", desc: "Alitas de pollo con salsa a elegir.", price: 139, tags: ["savory", "shareable", "spicy"], dayparts: LUNCH_DINNER, prep: 660, mods: wingsModifiers, complements: ["bebidas"] },
      { slug: "cajeta-baitz", name: "Cajeta Baitz", cat: "postres", desc: "Bocados de pan dulce con cajeta.", price: 69, tags: ["sweet", "dessert", "shareable"], dayparts: ALL_DAY, prep: 420 },
      { slug: "canela-baitz", name: "Canela Baitz", cat: "postres", desc: "Bocados de pan dulce con canela.", price: 69, tags: ["sweet", "dessert", "shareable"], dayparts: ALL_DAY, prep: 420 },
      { slug: "refresco-dominos", name: "Refresco", cat: "bebidas", desc: "Refresco frío de presentación individual.", price: 35, tags: ["cold_drink"], dayparts: ALL_DAY, prep: 30, mods: [sodaSize] },
    ],
  },
  "carls-jr": {
    url: CARLS_URL,
    items: [
      { slug: "famous-star", name: "Famous Star con Queso", cat: "burgers", desc: "Burger a la parrilla con queso y vegetales.", price: 119, tags: ["savory", "grilled", "cheese"], dayparts: LUNCH_DINNER, prep: 300, mods: burgerModifiers({}), complements: ["acompanamientos", "bebidas", "postres"] },
      { slug: "super-star", name: "Super Star con Queso", cat: "burgers", desc: "Burger doble a la parrilla con queso.", price: 149, tags: ["savory", "grilled", "cheese"], dayparts: LUNCH_DINNER, prep: 360, mods: burgerModifiers({}), complements: ["acompanamientos", "bebidas"] },
      { slug: "western-bacon", name: "Western Bacon Cheeseburger", cat: "burgers", desc: "Burger con tocino, queso y aros de cebolla.", price: 139, tags: ["savory", "grilled", "cheese"], dayparts: LUNCH_DINNER, prep: 360, mods: burgerModifiers({ double: true }), complements: ["acompanamientos", "bebidas"] },
      { slug: "big-carl", name: "The Big Carl", cat: "burgers", desc: "Burger doble con queso y salsa de la casa.", price: 149, tags: ["savory", "grilled", "cheese"], dayparts: LUNCH_DINNER, prep: 360, mods: burgerModifiers({}), complements: ["acompanamientos", "bebidas"] },
      { slug: "teriyaki", name: "Teriyaki Burger", cat: "burgers", desc: "Burger con salsa teriyaki y piña.", price: 129, tags: ["savory", "grilled"], dayparts: LUNCH_DINNER, prep: 330, mods: burgerModifiers({}), complements: ["acompanamientos", "bebidas"] },
      { slug: "guacamole-bacon", name: "Guacamole Bacon Burger", cat: "burgers", desc: "Burger con guacamole y tocino.", price: 145, tags: ["savory", "grilled"], dayparts: LUNCH_DINNER, prep: 360, mods: burgerModifiers({}), complements: ["acompanamientos", "bebidas"] },
      { slug: "original-big-angus", name: "Original Big Angus", cat: "big-angus", desc: "Burger de carne Angus a la parrilla.", price: 169, tags: ["savory", "grilled", "cheese"], dayparts: LUNCH_DINNER, prep: 420, mods: burgerModifiers({}), complements: ["acompanamientos", "bebidas"] },
      { slug: "el-diablo-big-angus", name: "El Diablo Big Angus", cat: "big-angus", desc: "Burger Angus con ingredientes picantes.", price: 179, tags: ["savory", "grilled", "spicy", "cheese"], dayparts: LUNCH_DINNER, prep: 420, mods: burgerModifiers({}), complements: ["acompanamientos", "bebidas"] },
      { slug: "low-carb-big-angus", name: "Low Carb Big Angus", cat: "big-angus", desc: "Burger Angus servida en hojas de lechuga en lugar de pan.", price: 169, tags: ["savory", "grilled"], dayparts: LUNCH_DINNER, prep: 420, mods: burgerModifiers({}), complements: ["bebidas"] },
      { slug: "combo-famous-star", name: "Combo Famous Star", cat: "combos", desc: "Famous Star con Queso + papas + bebida.", price: 179, tags: ["savory", "grilled", "combo"], dayparts: LUNCH_DINNER, prep: 330, mods: [friesSize], complements: ["postres"] },
      { slug: "estrellas-de-pollo", name: "Estrellas de Pollo", cat: "pollo", desc: "Piezas de pollo empanizado en forma de estrella.", price: 99, tags: ["savory", "shareable"], dayparts: LUNCH_DINNER, prep: 300, complements: ["acompanamientos", "bebidas"] },
      { slug: "portobello", name: "Portobello Mushroom", cat: "veggie", desc: "Burger con hongo portobello. Confirmar ingredientes antes de etiquetarla como vegetariana.", price: 139, tags: ["savory", "grilled", "vegetarian_option"], dayparts: LUNCH_DINNER, prep: 360, mods: burgerModifiers({}), complements: ["acompanamientos", "bebidas"] },
      { slug: "papas", name: "Papas a la francesa", cat: "acompanamientos", desc: "Papas fritas.", price: 49, tags: ["savory", "side"], dayparts: LUNCH_DINNER, prep: 180, mods: [friesSize], complements: ["bebidas"] },
      { slug: "aros-cebolla", name: "Aros de cebolla", cat: "acompanamientos", desc: "Aros de cebolla empanizados.", price: 59, tags: ["savory", "side"], dayparts: LUNCH_DINNER, prep: 240, complements: ["bebidas"] },
      { slug: "malteada", name: "Malteada", cat: "bebidas", desc: "Malteada fría de vainilla, chocolate o fresa.", price: 69, tags: ["cold_drink", "sweet", "dessert"], dayparts: ALL_DAY, prep: 150 },
      { slug: "refresco-carls", name: "Refresco", cat: "bebidas", desc: "Refresco frío.", price: 35, tags: ["cold_drink"], dayparts: ALL_DAY, prep: 30, mods: [sodaSize] },
      { slug: "pay-chocolate", name: "Pay de chocolate", cat: "postres", desc: "Rebanada de pay de chocolate.", price: 49, tags: ["sweet", "dessert"], dayparts: ALL_DAY, prep: 60 },
    ],
  },
  "degas-cafe": {
    url: DEGAS_URL,
    items: [
      { slug: "espresso", name: "Espresso", cat: "cafe-caliente", desc: "Shot de espresso.", price: 39, tags: ["hot_drink", "coffee", "breakfast"], prep: 90, mods: [extraShot] , complements: ["reposteria", "croissants"] },
      { slug: "espresso-cortado", name: "Espresso cortado", cat: "cafe-caliente", desc: "Espresso con un toque de leche.", price: 45, tags: ["hot_drink", "coffee", "breakfast"], prep: 100, mods: [milk, extraShot], complements: ["reposteria", "croissants"] },
      { slug: "americano", name: "Americano", cat: "cafe-caliente", desc: "Espresso alargado con agua caliente.", price: 45, tags: ["hot_drink", "coffee", "breakfast"], prep: 100, mods: espressoMods, complements: ["reposteria", "croissants", "paninis"] },
      { slug: "cappuccino", name: "Cappuccino", cat: "cafe-caliente", desc: "Espresso con leche vaporizada y espuma.", price: 59, tags: ["hot_drink", "coffee", "breakfast", "comfort"], prep: 150, mods: milkCoffeeMods, complements: ["reposteria", "croissants"] },
      { slug: "moka", name: "Moka", cat: "cafe-caliente", desc: "Espresso con chocolate y leche.", price: 65, tags: ["hot_drink", "coffee", "sweet", "comfort"], prep: 160, mods: milkCoffeeMods, complements: ["reposteria"] },
      { slug: "americano-frio", name: "Americano frío", cat: "cafe-frio", desc: "Espresso con agua fría y hielo.", price: 49, tags: ["cold_drink", "coffee"], prep: 100, mods: espressoMods, complements: ["reposteria", "paninis"] },
      { slug: "cafe-degas-frio", name: "Café Degas frío", cat: "cafe-frio", desc: "Especialidad fría de la casa.", price: 69, tags: ["cold_drink", "coffee", "sweet"], prep: 150, mods: milkCoffeeMods, complements: ["reposteria"] },
      { slug: "frappe-cookies", name: "Frappé Cookies & Cream", cat: "frappes", desc: "Frappé con galleta.", price: 79, tags: ["cold_drink", "sweet", "dessert"], prep: 210, mods: [coffeeSize, milk], complements: ["paninis", "croissants"] },
      { slug: "frappe-chocolate", name: "Frappé de chocolate", cat: "frappes", desc: "Frappé de chocolate.", price: 75, tags: ["cold_drink", "sweet", "dessert"], prep: 210, mods: [coffeeSize, milk], complements: ["paninis", "croissants"] },
      { slug: "frappe-cajeta", name: "Frappé de cajeta", cat: "frappes", desc: "Frappé con cajeta.", price: 75, tags: ["cold_drink", "sweet", "dessert"], prep: 210, mods: [coffeeSize, milk], complements: ["paninis", "croissants"] },
      { slug: "frappe-coco", name: "Frappé de coco", cat: "frappes", desc: "Frappé sabor coco.", price: 75, tags: ["cold_drink", "sweet", "dessert"], prep: 210, mods: [coffeeSize, milk], complements: ["paninis", "croissants"] },
      { slug: "moka-frappe", name: "Moka frappé", cat: "frappes", desc: "Frappé de café con chocolate.", price: 79, tags: ["cold_drink", "coffee", "sweet"], prep: 210, mods: [coffeeSize, milk, extraShot], complements: ["paninis", "croissants"] },
      { slug: "smoothie", name: "Smoothie de frutas", cat: "smoothies", desc: "Smoothie frío de frutas (sabor sujeto a disponibilidad).", price: 72, tags: ["cold_drink", "sweet"], prep: 180, mods: [coffeeSize], complements: ["paninis", "croissants"] },
      { slug: "chai", name: "Chai latte", cat: "tes", desc: "Té chai especiado con leche.", price: 62, tags: ["hot_drink", "tea", "comfort", "sweet"], prep: 150, mods: [coffeeSize, milk], complements: ["reposteria"] },
      { slug: "panini-europeo", name: "Panini europeo", cat: "paninis", desc: "Panini caliente estilo europeo.", price: 115, tags: ["savory", "comfort"], dayparts: LUNCH_DINNER, prep: 360, complements: ["cafe-frio", "cafe-caliente", "frappes"] },
      { slug: "panini-espanol", name: "Panini español", cat: "paninis", desc: "Panini caliente estilo español.", price: 119, tags: ["savory", "comfort"], dayparts: LUNCH_DINNER, prep: 360, complements: ["cafe-frio", "cafe-caliente", "frappes"] },
      { slug: "panini-bolones", name: "Panini boloñés", cat: "paninis", desc: "Panini caliente estilo boloñés.", price: 115, tags: ["savory", "comfort"], dayparts: LUNCH_DINNER, prep: 360, complements: ["cafe-frio", "cafe-caliente", "frappes"] },
      { slug: "panini-tres-quesos", name: "Panini tres quesos", cat: "paninis", desc: "Panini caliente con tres quesos.", price: 109, tags: ["savory", "cheese", "comfort"], dayparts: LUNCH_DINNER, prep: 330, complements: ["cafe-frio", "cafe-caliente", "frappes"] },
      { slug: "croissant-jamon-queso", name: "Croissant de jamón con queso", cat: "croissants", desc: "Croissant relleno de jamón y queso.", price: 79, tags: ["savory", "breakfast", "cheese"], dayparts: ALL_DAY, prep: 240, complements: ["cafe-caliente", "cafe-frio"] },
      { slug: "croissant-pollo", name: "Croissant de pollo", cat: "croissants", desc: "Croissant relleno de pollo.", price: 85, tags: ["savory", "breakfast"], dayparts: ALL_DAY, prep: 240, complements: ["cafe-caliente", "cafe-frio"] },
      { slug: "bisquet", name: "Bisquet", cat: "reposteria", desc: "Bisquet horneado.", price: 35, tags: ["sweet", "breakfast", "comfort"], dayparts: ["morning", "afternoon"], prep: 60, complements: ["cafe-caliente"] },
      { slug: "muffin", name: "Muffin", cat: "reposteria", desc: "Muffin horneado.", price: 45, tags: ["sweet", "breakfast", "dessert"], prep: 30, complements: ["cafe-caliente", "cafe-frio"] },
      { slug: "pay-tortuga", name: "Pay tortuga", cat: "reposteria", desc: "Rebanada de pay tortuga.", price: 69, tags: ["sweet", "dessert"], prep: 45, complements: ["cafe-caliente", "cafe-frio"] },
      { slug: "pay-queso-fresas", name: "Pay de queso con fresas", cat: "reposteria", desc: "Rebanada de pay de queso con fresas.", price: 69, tags: ["sweet", "dessert"], prep: 45, complements: ["cafe-caliente", "cafe-frio"] },
      { slug: "pan-de-elote", name: "Pan de elote", cat: "reposteria", desc: "Rebanada de pan de elote.", price: 49, tags: ["sweet", "dessert", "comfort"], prep: 45, complements: ["cafe-caliente"] },
      { slug: "pay-limon", name: "Pay de limón", cat: "reposteria", desc: "Rebanada de pay de limón.", price: 65, tags: ["sweet", "dessert"], prep: 45, complements: ["cafe-frio", "cafe-caliente"] },
    ],
  },
};

export const PRODUCTS: Product[] = BRANDS.flatMap((brand) => {
  const def = PRODUCT_DEFS[brand.slug];
  return def.items.map((p): Product => {
    const cat = CATEGORIES.find((c) => c.brandId === brand.id && c.slug === p.cat);
    if (!cat) throw new Error(`Categoría ${p.cat} no existe en ${brand.slug}`);
    return {
      id: stableUuid(`product:${brand.slug}:${p.slug}`),
      brandId: brand.id,
      categoryId: cat.id,
      slug: p.slug,
      name: p.name,
      description: p.desc,
      price: p.price,
      currency: "MXN",
      imagePath: null,
      tags: p.tags,
      dayparts: p.dayparts ?? ALL_DAY,
      prepTimeSeconds: p.prep ?? null,
      isAvailable: true,
      isActive: true,
      stockDemo: p.stock ?? 20,
      dietaryTags: p.dietary ?? [],
      modifiers: p.mods ?? [],
      complementCategorySlugs: p.complements ?? [],
      priceSource: DEMO_PRICE_SOURCE,
      sourceUrl: def.url,
    };
  });
});

export function getStaticMenu(slug: BrandSlug): MenuData {
  const brand = brandBySlug(slug);
  return {
    brand,
    categories: CATEGORIES.filter((c) => c.brandId === brand.id).sort((a, b) => a.sortOrder - b.sortOrder),
    products: PRODUCTS.filter((p) => p.brandId === brand.id),
  };
}
