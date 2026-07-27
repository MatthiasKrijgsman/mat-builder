import { nanoid } from "nanoid";
import type { BlockRegistry } from "./registry.ts";
import type { BlockId, BlockLocation, BlockNode, BuilderDocument, NewBlockSpec } from "./types.ts";

/*
 * Internal: builds the BlockNode subtree for a newly created block —
 * shared by `insertBlock` and `createDocument`.
 */

export interface MaterializedSubtree {
    /** Id of the subtree's top block */
    rootId: BlockId;
    /** Every created node, top block first */
    nodes: BlockNode[];
}

/**
 * Creates nodes for `spec`: `defaultProps` merged with the spec's props,
 * then the definition's `onCreate` patch applied, with `onCreate`/spec
 * children materialized recursively (fresh nanoids). Throws on unknown
 * types — new blocks can only be created from registered definitions.
 */
export function materializeBlock(
    document: BuilderDocument,
    registry: BlockRegistry,
    spec: NewBlockSpec,
    location: BlockLocation | null,
    id: BlockId = nanoid(),
): MaterializedSubtree {
    const definition = registry.getDefinition(spec.type);
    if (!definition) {
        throw new Error(`Cannot create block of unknown type "${spec.type}"`);
    }

    const node: BlockNode = {
        id,
        type: spec.type,
        props: { ...definition.defaultProps, ...spec.props },
        children: {},
    };
    for (const container of definition.containers ?? []) {
        node.children[container.name] = [];
    }

    const created = definition.onCreate?.({ document, location });
    if (created && created.props) Object.assign(node.props, created.props);

    const nodes: BlockNode[] = [node];
    // An explicit spec beats the definition's own defaults: a parent that
    // seeds its subtree (a table describing its rows and their cells) must not
    // have those children replaced by each child type's `onCreate` fallback.
    const childSpecs = { ...created?.children, ...spec.children };
    for (const [containerName, specs] of Object.entries(childSpecs)) {
        const list = node.children[containerName];
        if (!list) {
            throw new Error(
                `Container "${containerName}" does not exist on type "${spec.type}" (from onCreate/spec children)`,
            );
        }
        for (const childSpec of specs) {
            const child = materializeBlock(document, registry, childSpec, null);
            list.push(child.rootId);
            nodes.push(...child.nodes);
        }
    }
    return { rootId: id, nodes };
}
