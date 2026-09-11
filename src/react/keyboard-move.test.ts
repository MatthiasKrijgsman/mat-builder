import { describe, expect, it } from "vitest";
import { block, exampleDoc, testRegistry } from "../core/test-fixtures.ts";
import type { BuilderDocument } from "../core/types.ts";
import { moveTargetFor } from "./keyboard-move.ts";

/** root(main: [sec1, t2]) → sec1 columns(left: [t1, b1], right: []) */
function doc(): BuilderDocument {
    const base = exampleDoc();
    return {
        ...base,
        blocks: {
            ...base.blocks,
            root: block({ id: "root", type: "root", props: { backgroundColor: "#fff" }, children: { main: ["sec1", "t2"] } }),
            sec1: block({ id: "sec1", type: "columns", props: { gap: 16 }, children: { left: ["t1", "b1"], right: [] } }),
            t2: block({ id: "t2", type: "text", props: { text: "After" } }),
        },
    };
}

describe("moveTargetFor — the keyboard's drag and drop", () => {
    it("up / down swap with the neighbouring sibling, in pre-move indices", () => {
        expect(moveTargetFor(doc(), testRegistry, "b1", "up")).toEqual({ parentId: "sec1", container: "left", index: 0 });
        expect(moveTargetFor(doc(), testRegistry, "t1", "down")).toEqual({ parentId: "sec1", container: "left", index: 2 });
        // Already first / last: nothing to swap with
        expect(moveTargetFor(doc(), testRegistry, "t1", "up")).toBeNull();
        expect(moveTargetFor(doc(), testRegistry, "b1", "down")).toBeNull();
    });

    it("out lands right after the parent, in the grandparent", () => {
        expect(moveTargetFor(doc(), testRegistry, "t1", "out")).toEqual({ parentId: "root", container: "main", index: 1 });
        // A child of the root has nowhere further out
        expect(moveTargetFor(doc(), testRegistry, "t2", "out")).toBeNull();
    });

    it("in enters the previous sibling's first container, at the end", () => {
        expect(moveTargetFor(doc(), testRegistry, "t2", "in")).toEqual({ parentId: "sec1", container: "left", index: 2 });
        // No previous sibling, or one without containers
        expect(moveTargetFor(doc(), testRegistry, "sec1", "in")).toBeNull();
        expect(moveTargetFor(doc(), testRegistry, "b1", "in")).toBeNull();
    });

    it("never moves the root, and respects what the destination accepts", () => {
        expect(moveTargetFor(doc(), testRegistry, "root", "down")).toBeNull();
        // `strict` only accepts text (test-fixtures): a button cannot enter it by key either
        const guarded = doc();
        guarded.blocks.root.children.main = ["s1", "b2"];
        guarded.blocks.s1 = block({ id: "s1", type: "strict", children: { items: [] } });
        guarded.blocks.b2 = block({ id: "b2", type: "button", props: { label: "Go" } });
        expect(moveTargetFor(guarded, testRegistry, "b2", "in")).toBeNull();
        guarded.blocks.b2 = block({ id: "b2", type: "text", props: { text: "Go" } });
        expect(moveTargetFor(guarded, testRegistry, "b2", "in")).toEqual({ parentId: "s1", container: "items", index: 0 });
    });
});
