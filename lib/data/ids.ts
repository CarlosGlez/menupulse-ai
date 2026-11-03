// IDs deterministas con formato UUID a partir de una clave legible.
// Permiten que el catálogo en TypeScript y el seed SQL compartan los mismos IDs.

function fnv1a(str: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function stableUuid(key: string): string {
  const parts = [0x811c9dc5, 0x1b873593, 0x85ebca6b, 0xc2b2ae35].map((s) =>
    fnv1a(key, s).toString(16).padStart(8, "0"),
  );
  const hex = parts.join("");
  // Versión 4/variante RFC para que sea un UUID válido en cualquier validador.
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    "4" + hex.slice(13, 16),
    ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16) + hex.slice(17, 20),
    hex.slice(20, 32),
  ].join("-");
}
