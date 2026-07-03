import type { BlockDefinition } from "./types.ts";

/**
 * Identity helper that pins down the props type parameter so `editRender`,
 * `inspector` and `defaultProps` are checked against the same shape.
 */
export function defineBlock<P>(definition: BlockDefinition<P>): BlockDefinition<P> {
    return definition;
}
