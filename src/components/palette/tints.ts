import type { BlockRegistry } from "../../core/registry.ts";

/*
 * Palette category tints — the single source of truth shared by the Palette
 * tiles and the Layers tree, so a block's icon is the same color in both.
 * Each --mat-builder-palette-tint-* set is background / border / icon (fg).
 */

/** Number of --mat-builder-palette-tint-* sets defined in styles/tokens.css. */
export const PALETTE_TINT_COUNT = 7;

/**
 * Category → tint index (1..PALETTE_TINT_COUNT), assigned in registry order
 * over the *unfiltered*, non-hidden definitions so colors stay stable while
 * searching and match between the palette and the layer tree.
 */
export function tintByCategory(registry: BlockRegistry): Map<string, number> {
  const map = new Map<string, number>();
  for (const definition of registry.definitions) {
    if (definition.hidden) continue;
    const category = definition.category ?? "Blocks";
    if (!map.has(category)) map.set(category, (map.size % PALETTE_TINT_COUNT) + 1);
  }
  return map;
}

/** The CSS var for one part of a tint set (e.g. tintCssVar(2, "fg")). */
export function tintCssVar(tint: number, part: "bg" | "border" | "fg"): string {
  return `var(--mat-builder-palette-tint-${tint}-${part})`;
}
