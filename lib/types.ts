// Tipos de dominio compartidos entre servidor, cliente y base de datos.

export type BrandSlug = "dominos" | "carls-jr" | "degas-cafe";
export const BRAND_SLUGS: BrandSlug[] = ["dominos", "carls-jr", "degas-cafe"];

export type Daypart = "morning" | "afternoon" | "evening";

/** Vocabulario controlado de etiquetas que el motor entiende. */
export type ProductTag =
  | "savory"
  | "sweet"
  | "dessert"
  | "cold_drink"
  | "hot_drink"
  | "coffee"
  | "tea"
  | "breakfast"
  | "comfort"
  | "shareable"
  | "family"
  | "spicy"
  | "cheese"
  | "grilled"
  | "combo"
  | "vegetarian_option"
  | "side";

export interface ModifierOption {
  id: string;
  label: string;
  /** Diferencia de precio DEMO en MXN respecto al precio base. */
  priceDelta: number;
}

export interface ModifierGroup {
  id: string;
  label: string;
  /** single = elegir exactamente una opción; multi = 0..max opciones */
  type: "single" | "multi";
  required: boolean;
  max?: number;
  options: ModifierOption[];
  defaultOptionId?: string;
  /** El grupo solo aplica si en otro grupo se eligió cierta opción (p. ej. tamaño de papas solo en combo). */
  dependsOn?: { groupId: string; optionId: string };
}

export interface Brand {
  id: string;
  slug: BrandSlug;
  name: string;
  description: string;
  /** Cómo se nombra la fila en esta marca (autos, clientes, órdenes). */
  queueLabel: string;
}

export interface Category {
  id: string;
  brandId: string;
  slug: string;
  name: string;
  sortOrder: number;
}

export interface Product {
  id: string;
  brandId: string;
  categoryId: string;
  slug: string;
  name: string;
  description: string;
  /** Precio DEMO en MXN; null si aún no hay valor de demostración. */
  price: number | null;
  currency: "MXN";
  imagePath: string | null;
  tags: ProductTag[];
  dayparts: Daypart[];
  /** Tiempo de preparación DEMO (segundos); null = no configurado. */
  prepTimeSeconds: number | null;
  isAvailable: boolean;
  isActive: boolean;
  stockDemo: number | null;
  dietaryTags: string[];
  modifiers: ModifierGroup[];
  /** Slugs de categorías que complementan a este producto (cross-selling). */
  complementCategorySlugs: string[];
  priceSource: string;
  sourceUrl: string | null;
}

export interface MenuData {
  brand: Brand;
  categories: Category[];
  products: Product[];
}

export type SourceMode = "interactive_demo" | "synthetic_batch";

export type InteractionEventType =
  | "impression"
  | "click"
  | "add_to_cart"
  | "remove_from_cart"
  | "purchase"
  | "rating_positive"
  | "rating_negative";
