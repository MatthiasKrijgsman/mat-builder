import type { BlockRegistry } from "../../core/registry.ts";
import type { BlockPattern } from "../../core/types.ts";

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
export function tintByCategory(registry: BlockRegistry, patterns: readonly BlockPattern[] = []): Map<string, number> {
  const map = new Map<string, number>();
  const take = (category: string) => {
    if (!map.has(category)) map.set(category, (map.size % PALETTE_TINT_COUNT) + 1);
  };
  for (const definition of registry.definitions) {
    if (definition.hidden) continue;
    take(definition.category ?? "Blocks");
  }
  // Patterns are assigned AFTER every block category, so passing them (the
  // Palette does, the Layers tree does not) never shifts a block's color.
  for (const pattern of patterns) take(pattern.category ?? PATTERN_CATEGORY);
  return map;
}

/** Default palette grouping for patterns that don't name a category. */
export const PATTERN_CATEGORY = "Patterns";

/**
 * The CSS var for one part of a tint set (e.g. tintCssVar(2, "fg")).
 *
 * The icon colour reads through `--mat-builder-palette-icon-fg` first: it is
 * `initial` (the guaranteed-invalid value) by default, so `var()` falls
 * through to the per-category tint, and a host wanting one quiet colour for
 * every icon sets that single token instead of all seven tints.
 */
export function tintCssVar(tint: number, part: "bg" | "border" | "fg"): string {
  const own = `var(--mat-builder-palette-tint-${tint}-${part})`;
  return part === "fg" ? `var(--mat-builder-palette-icon-fg, ${own})` : own;
}
