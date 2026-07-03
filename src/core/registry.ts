import type { AcceptCtx, BlockDefinition, ContainerDef } from "./types.ts";

/*
 * Block registry — see docs/03-architecture.md §2.
 *
 * The registry is just the array of definitions handed to the provider,
 * wrapped in a Map. Unknown types found in a loaded document are tolerated:
 * `getDefinition` returns undefined and callers degrade gracefully (the
 * canvas renders a "missing block" placeholder; commands and validation
 * skip definition-dependent checks).
 */

// Props are erased at the registry boundary — definitions with different P coexist.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyBlockDefinition = BlockDefinition<any>;

export interface BlockRegistry {
    definitions: readonly AnyBlockDefinition[];
    getDefinition(type: string): AnyBlockDefinition | undefined;
    has(type: string): boolean;
}

export function createRegistry(definitions: AnyBlockDefinition[]): BlockRegistry {
    const byType = new Map<string, AnyBlockDefinition>();
    for (const definition of definitions) {
        if (byType.has(definition.type)) {
            throw new Error(`createRegistry: duplicate block type "${definition.type}"`);
        }
        byType.set(definition.type, definition);
    }
    return {
        definitions: [...definitions],
        getDefinition: (type) => byType.get(type),
        has: (type) => byType.has(type),
    };
}

/** Evaluates a container's `accepts` rule (array or function form; omitted = accept all). */
export function containerAccepts(container: ContainerDef, childType: string, ctx: AcceptCtx): boolean {
    if (!container.accepts) return true;
    return Array.isArray(container.accepts)
        ? container.accepts.includes(childType)
        : container.accepts(childType, ctx);
}
