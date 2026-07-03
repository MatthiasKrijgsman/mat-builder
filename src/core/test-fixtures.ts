import { defineBlock } from "./define-block.ts";
import { createRegistry } from "./registry.ts";
import type { BlockNode, BuilderDocument } from "./types.ts";

/*
 * Shared vitest fixtures for the core suites — a mini block set exercising
 * containers, accepts (array + function form), maxChildren, canDelete/canDrag
 * and onCreate. Excluded from the build (tsconfig.build.json).
 */

export const rootBlock = defineBlock<{ backgroundColor: string }>({
    type: "root",
    label: "Root",
    hidden: true,
    canDrag: false,
    canDelete: false,
    defaultProps: { backgroundColor: "#ffffff" },
    containers: [{ name: "main", layout: "vertical" }],
    editRender: () => null,
});

export const sectionBlock = defineBlock<{ padding: number }>({
    type: "section",
    label: "Section",
    defaultProps: { padding: 16 },
    containers: [{ name: "body", layout: "vertical", accepts: ["text", "button", "columns", "section"] }],
    editRender: () => null,
});

export const columnsBlock = defineBlock<{ gap: number }>({
    type: "columns",
    label: "Columns",
    defaultProps: { gap: 16 },
    containers: [
        { name: "left", layout: "vertical" },
        { name: "right", layout: "vertical", maxChildren: 2 },
    ],
    editRender: () => null,
});

export const strictBlock = defineBlock({
    type: "strict",
    label: "Strict",
    defaultProps: {},
    containers: [{ name: "items", layout: "vertical", accepts: (childType) => childType === "text" }],
    editRender: () => null,
});

export const textBlock = defineBlock<{ text: string }>({
    type: "text",
    label: "Text",
    defaultProps: { text: "Hello" },
    editRender: () => null,
});

export const buttonBlock = defineBlock<{ label: string }>({
    type: "button",
    label: "Button",
    defaultProps: { label: "Click" },
    editRender: () => null,
});

export const lockedBlock = defineBlock({
    type: "locked",
    label: "Locked",
    canDelete: false,
    canDrag: false,
    defaultProps: {},
    editRender: () => null,
});

/** Self-populates one text child and derives a prop from the drop location. */
export const prefilledBlock = defineBlock<{ note: string }>({
    type: "prefilled",
    label: "Prefilled",
    defaultProps: { note: "" },
    containers: [{ name: "items", layout: "vertical" }],
    onCreate: ({ location }) => ({
        props: { note: location ? `dropped at ${location.index}` : "created as root" },
        children: { items: [{ type: "text", props: { text: "Prefilled child" } }] },
    }),
    editRender: () => null,
});

export const testRegistry = createRegistry([
    rootBlock,
    sectionBlock,
    columnsBlock,
    strictBlock,
    textBlock,
    buttonBlock,
    lockedBlock,
    prefilledBlock,
]);

export function block(partial: Partial<BlockNode> & { id: string; type: string }): BlockNode {
    return { props: {}, children: {}, ...partial };
}

/**
 * The docs/03 example shape: root(main: [sec1]) → sec1 columns(left: [t1], right: [b1]).
 */
export function exampleDoc(): BuilderDocument {
    return {
        version: 1,
        rootId: "root",
        blocks: {
            root: block({ id: "root", type: "root", children: { main: ["sec1"] } }),
            sec1: block({ id: "sec1", type: "columns", children: { left: ["t1"], right: ["b1"] } }),
            t1: block({ id: "t1", type: "text", props: { text: "Hello" } }),
            b1: block({ id: "b1", type: "button", props: { label: "Buy" } }),
        },
    };
}
