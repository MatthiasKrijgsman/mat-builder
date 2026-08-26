import type { BlockSpec, ContainerSlotRef } from "./types.ts";

/*
 * Composed-block helpers — see docs/08-composed-blocks.md.
 *
 * Pure and server-safe: the output pipeline walks the same specs the canvas
 * does, so nothing here may reach for React or the DOM.
 */

/**
 * Stands a composite's own container in for a child list inside its composed
 * tree, so real document nodes render at that position:
 *
 *   containers: [{ name: "body", layout: "vertical" }],
 *   compose: (props) => ({ type: "container", children: { content: slot("body") } })
 */
export function slot(name: string): ContainerSlotRef {
    return { __slot: name };
}

export function isSlotRef(value: unknown): value is ContainerSlotRef {
    return typeof value === "object" && value !== null && typeof (value as ContainerSlotRef).__slot === "string";
}

/** Every composite prop key a spec tree binds, for uniqueness checks. */
export function collectBindings(spec: BlockSpec, into: string[] = []): string[] {
    for (const key of Object.values(spec.bind ?? {})) into.push(key);
    for (const children of Object.values(spec.children ?? {})) {
        if (isSlotRef(children)) continue;
        for (const child of children) collectBindings(child, into);
    }
    return into;
}

/** Every slot name a spec tree references, in tree order. */
export function collectSlots(spec: BlockSpec, into: string[] = []): string[] {
    for (const children of Object.values(spec.children ?? {})) {
        if (isSlotRef(children)) into.push(children.__slot);
        else for (const child of children) collectSlots(child, into);
    }
    return into;
}
