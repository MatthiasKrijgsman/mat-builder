import { attachClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { attachInstruction } from "@atlaskit/pragmatic-drag-and-drop-hitbox/list-item";
import type { Input } from "@atlaskit/pragmatic-drag-and-drop/types";
import { describe, expect, it } from "vitest";
import { block, exampleDoc, testRegistry } from "../core/test-fixtures.ts";
import { isBuilderDrag, makeMoveBlockDrag, makeNewBlockDrag } from "./drag-data.ts";
import { dragBlockType, resolveDropLocation } from "./resolve.ts";

/** Stub element + pointer input for the hitbox helpers (they only read rect + client coords). */
const rect = { top: 0, left: 0, width: 100, height: 40 };
const element = {
    getBoundingClientRect: () => ({ ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height }),
} as unknown as Element;
const inputAt = (clientX: number, clientY: number) => ({ clientX, clientY }) as Input;

describe("drag data guards", () => {
    it("brands payloads per instance", () => {
        const a = Symbol("a");
        const b = Symbol("b");
        expect(isBuilderDrag(makeNewBlockDrag(a, "text"), a)).toBe(true);
        expect(isBuilderDrag(makeNewBlockDrag(a, "text"), b)).toBe(false);
        expect(isBuilderDrag({ instanceId: a, kind: "something-else" }, a)).toBe(false);
    });
});

describe("dragBlockType", () => {
    it("returns the palette type or the moved node's type", () => {
        const doc = exampleDoc();
        const id = Symbol("i");
        expect(dragBlockType(doc, makeNewBlockDrag(id, "button"))).toBe("button");
        expect(dragBlockType(doc, makeMoveBlockDrag(id, "t1"))).toBe("text");
        expect(dragBlockType(doc, makeMoveBlockDrag(id, "ghost"))).toBeNull();
    });
});

describe("resolveDropLocation", () => {
    it("container targets append at the end", () => {
        const to = resolveDropLocation(exampleDoc(), testRegistry, {
            targetKind: "container",
            parentId: "sec1",
            container: "left",
        });
        expect(to).toEqual({ parentId: "sec1", container: "left", index: 1 });

        expect(
            resolveDropLocation(exampleDoc(), testRegistry, {
                targetKind: "container",
                parentId: "ghost",
                container: "left",
            }),
        ).toBeNull();
    });

    it("sibling targets resolve before/after from the closest edge (pre-move indexes)", () => {
        const nearTop = attachClosestEdge(
            { targetKind: "sibling", blockId: "t1" },
            { element, input: inputAt(50, 5), allowedEdges: ["top", "bottom"] },
        );
        expect(resolveDropLocation(exampleDoc(), testRegistry, nearTop as never)).toEqual({
            parentId: "sec1",
            container: "left",
            index: 0,
        });

        const nearBottom = attachClosestEdge(
            { targetKind: "sibling", blockId: "t1" },
            { element, input: inputAt(50, 38), allowedEdges: ["top", "bottom"] },
        );
        expect(resolveDropLocation(exampleDoc(), testRegistry, nearBottom as never)).toEqual({
            parentId: "sec1",
            container: "left",
            index: 1,
        });
    });

    it("sibling targets recompute the location at drop time and reject unparented blocks", () => {
        const onRoot = attachClosestEdge(
            { targetKind: "sibling", blockId: "root" },
            { element, input: inputAt(50, 5), allowedEdges: ["top", "bottom"] },
        );
        expect(resolveDropLocation(exampleDoc(), testRegistry, onRoot as never)).toBeNull();
    });

    it("layer rows resolve reorder and combine instructions", () => {
        const reorderAfter = attachInstruction(
            { targetKind: "layer-row", blockId: "t1" },
            {
                element,
                input: inputAt(50, 38),
                operations: { "reorder-before": "available", "reorder-after": "available", combine: "available" },
            },
        );
        expect(resolveDropLocation(exampleDoc(), testRegistry, reorderAfter as never)).toEqual({
            parentId: "sec1",
            container: "left",
            index: 1,
        });

        // combine → first container of the row's block (sec1 = columns → "left")
        const combine = attachInstruction(
            { targetKind: "layer-row", blockId: "sec1" },
            {
                element,
                input: inputAt(50, 20),
                operations: { "reorder-before": "not-available", "reorder-after": "not-available", combine: "available" },
            },
        );
        expect(resolveDropLocation(exampleDoc(), testRegistry, combine as never)).toEqual({
            parentId: "sec1",
            container: "left",
            index: 1,
        });

        // combine on a leaf block (no containers) resolves to nothing
        const combineLeaf = attachInstruction(
            { targetKind: "layer-row", blockId: "t1" },
            {
                element,
                input: inputAt(50, 20),
                operations: { "reorder-before": "not-available", "reorder-after": "not-available", combine: "available" },
            },
        );
        expect(resolveDropLocation(exampleDoc(), testRegistry, combineLeaf as never)).toBeNull();
    });

    it("combine is drag-aware: skips containers that do not accept the drag", () => {
        const doc = exampleDoc();
        doc.blocks.root.children.main.push("strict1");
        doc.blocks.strict1 = block({ id: "strict1", type: "strict", children: { items: [] } });

        const combineOnStrict = () =>
            attachInstruction(
                { targetKind: "layer-row", blockId: "strict1" },
                {
                    element,
                    input: inputAt(50, 20),
                    operations: { "reorder-before": "not-available", "reorder-after": "not-available", combine: "available" },
                },
            );

        const id = Symbol("i");
        // strict.items accepts only "text"
        expect(
            resolveDropLocation(doc, testRegistry, combineOnStrict() as never, makeNewBlockDrag(id, "text")),
        ).toEqual({ parentId: "strict1", container: "items", index: 0 });
        expect(
            resolveDropLocation(doc, testRegistry, combineOnStrict() as never, makeNewBlockDrag(id, "button")),
        ).toBeNull();
    });
});
