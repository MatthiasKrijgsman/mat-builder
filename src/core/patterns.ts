import type { BlockId, BlockPattern, BuilderDocument, NewBlockSpec } from "./types.ts";

/*
 * Patterns — see docs/08-composed-blocks.md §7.
 *
 * A pattern is a `NewBlockSpec` tree that EXPANDS on insert into ordinary
 * blocks; the document never holds a pattern type. That is the whole idea:
 * no output renderer, no `accepts` entry, nothing for validation to learn —
 * after the drop it is just blocks, and the host's stored documents render
 * on a build of the library that has never heard of the pattern.
 *
 * Patterns are therefore NOT block definitions and deliberately never enter
 * the registry (docs/08 §10): `getDefinition`, `canDropAt` and validation
 * keep dealing only in real block types. The Palette merges them into its
 * list for display, and that is the only place the two concepts meet.
 */

/** Identity helper, mirroring `defineBlock` — pins the shape for inference. */
export function definePattern(pattern: BlockPattern): BlockPattern {
    return pattern;
}

/**
 * The spec that would recreate `id`'s subtree — ids dropped, props, children
 * and visibility kept.
 *
 * Nothing in the library calls this yet. It exists so that "select these
 * blocks → save as a pattern" (docs/07 §C5) is later a UI and storage job
 * rather than a redesign: the conversion is the part that would otherwise
 * have to be invented, and it is pure, so it is cheap to ship now and test.
 */
export function specFromSubtree(document: BuilderDocument, id: BlockId): NewBlockSpec | null {
    const node = document.blocks[id];
    if (!node) return null;

    const children: Record<string, NewBlockSpec[]> = {};
    for (const [container, childIds] of Object.entries(node.children)) {
        // Dangling ids are skipped rather than throwing: a pattern lifted from
        // a slightly corrupt document should still be usable.
        const specs = childIds
            .map((childId) => specFromSubtree(document, childId))
            .filter((spec): spec is NewBlockSpec => spec !== null);
        if (specs.length > 0) children[container] = specs;
    }

    const spec: NewBlockSpec = { type: node.type, props: structuredClone(node.props) };
    if (Object.keys(children).length > 0) spec.children = children;
    if (node.visibility) spec.visibility = structuredClone(node.visibility);
    return spec;
}
