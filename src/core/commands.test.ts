import { describe, expect, it } from "vitest";
import {
    canDropAt,
    duplicateBlock,
    insertBlock,
    moveBlock,
    removeBlock,
    setDocument,
    updateProps,
} from "./commands.ts";
import { validateDocument } from "./document.ts";
import { block, exampleDoc, testRegistry } from "./test-fixtures.ts";
import type { BuilderDocument } from "./types.ts";

/** root(main: [a, b, c]) with three text siblings — reorder fixture */
function siblingsDoc(): BuilderDocument {
    return {
        version: 1,
        rootId: "root",
        blocks: {
            root: block({ id: "root", type: "root", children: { main: ["a", "b", "c"] } }),
            a: block({ id: "a", type: "text" }),
            b: block({ id: "b", type: "text" }),
            c: block({ id: "c", type: "text" }),
        },
    };
}

describe("insertBlock", () => {
    const at = { parentId: "root", container: "main", index: 1 };

    it("creates a node from defaultProps at the location", () => {
        const doc = exampleDoc();
        const { document: next, blockId } = insertBlock(doc, { type: "text", at }, testRegistry);

        expect(next.blocks[blockId]).toEqual({ id: blockId, type: "text", props: { text: "Hello" }, children: {} });
        expect(next.blocks.root.children.main).toEqual(["sec1", blockId]);
        expect(validateDocument(next, testRegistry)).toEqual([]);
    });

    it("does not mutate the input document and shares untouched blocks", () => {
        const doc = exampleDoc();
        const { document: next, blockId } = insertBlock(doc, { type: "text", at }, testRegistry);

        expect(doc.blocks.root.children.main).toEqual(["sec1"]);
        expect(doc.blocks[blockId]).toBeUndefined();
        expect(next.blocks.sec1).toBe(doc.blocks.sec1);
    });

    it("merges payload props and honors a fixed id", () => {
        const { document: next } = insertBlock(
            exampleDoc(),
            { type: "text", at, props: { text: "Custom" }, id: "custom" },
            testRegistry,
        );
        expect(next.blocks.custom.props).toEqual({ text: "Custom" });
    });

    it("clamps the index into the list", () => {
        const appended = insertBlock(siblingsDoc(), { type: "text", at: { ...at, index: 99 } }, testRegistry);
        expect(appended.document.blocks.root.children.main[3]).toBe(appended.blockId);

        const prepended = insertBlock(siblingsDoc(), { type: "text", at: { ...at, index: -5 } }, testRegistry);
        expect(prepended.document.blocks.root.children.main[0]).toBe(prepended.blockId);
    });

    it("runs onCreate with the drop location and materializes its children", () => {
        const { document: next, blockId } = insertBlock(exampleDoc(), { type: "prefilled", at }, testRegistry);

        const node = next.blocks[blockId];
        expect(node.props.note).toBe("dropped at 1");
        expect(node.children.items).toHaveLength(1);
        expect(next.blocks[node.children.items[0]].props).toEqual({ text: "Prefilled child" });
        expect(validateDocument(next, testRegistry)).toEqual([]);
    });

    it("rejects unknown types, unknown containers, accepts violations and full containers", () => {
        const doc = exampleDoc();
        expect(() => insertBlock(doc, { type: "nope", at }, testRegistry)).toThrow(/unknown type "nope"/);
        expect(() =>
            insertBlock(doc, { type: "text", at: { ...at, container: "bogus" } }, testRegistry),
        ).toThrow(/container "bogus" does not exist/);
        const withSection = exampleDoc();
        withSection.blocks.root.children.main.push("s1");
        withSection.blocks.s1 = block({ id: "s1", type: "section", children: { body: [] } });
        expect(() =>
            insertBlock(withSection, { type: "locked", at: { parentId: "s1", container: "body", index: 0 } }, testRegistry),
        ).toThrow(/does not accept type "locked"/);

        // sec1.right has maxChildren 2
        const full = exampleDoc();
        full.blocks.sec1.children.right.push("b2");
        full.blocks.b2 = block({ id: "b2", type: "button" });
        expect(() =>
            insertBlock(full, { type: "button", at: { parentId: "sec1", container: "right", index: 0 } }, testRegistry),
        ).toThrow(/is full/);
    });

    it("tolerates unknown parent types for container keys already on the node", () => {
        const doc = exampleDoc();
        doc.blocks.root.children.main.push("legacy1");
        doc.blocks.legacy1 = block({ id: "legacy1", type: "legacy", children: { slot: [] } });

        const at = { parentId: "legacy1", container: "slot", index: 0 };
        const { document: next } = insertBlock(doc, { type: "text", at }, testRegistry);
        expect(next.blocks.legacy1.children.slot).toHaveLength(1);

        expect(() =>
            insertBlock(doc, { type: "text", at: { ...at, container: "other" } }, testRegistry),
        ).toThrow(/unknown type "legacy"/);
    });
});

describe("moveBlock", () => {
    it("reorders forward within a container (pre-move index semantics)", () => {
        const before = moveBlock(siblingsDoc(), { id: "a", to: { parentId: "root", container: "main", index: 2 } }, testRegistry);
        expect(before.blocks.root.children.main).toEqual(["b", "a", "c"]);

        const toEnd = moveBlock(siblingsDoc(), { id: "a", to: { parentId: "root", container: "main", index: 3 } }, testRegistry);
        expect(toEnd.blocks.root.children.main).toEqual(["b", "c", "a"]);
    });

    it("reorders backward and is a no-op when dropped on its own index", () => {
        const backward = moveBlock(siblingsDoc(), { id: "c", to: { parentId: "root", container: "main", index: 0 } }, testRegistry);
        expect(backward.blocks.root.children.main).toEqual(["c", "a", "b"]);

        const same = moveBlock(siblingsDoc(), { id: "b", to: { parentId: "root", container: "main", index: 1 } }, testRegistry);
        expect(same.blocks.root.children.main).toEqual(["a", "b", "c"]);
    });

    it("reparents across containers", () => {
        const doc = exampleDoc();
        const next = moveBlock(doc, { id: "t1", to: { parentId: "root", container: "main", index: 0 } }, testRegistry);

        expect(next.blocks.root.children.main).toEqual(["t1", "sec1"]);
        expect(next.blocks.sec1.children.left).toEqual([]);
        expect(validateDocument(next, testRegistry)).toEqual([]);
        expect(doc.blocks.root.children.main).toEqual(["sec1"]);
    });

    it("allows reordering inside a full container (the moving block does not count)", () => {
        const doc = exampleDoc();
        doc.blocks.sec1.children.right.push("b2");
        doc.blocks.b2 = block({ id: "b2", type: "button" });

        const next = moveBlock(doc, { id: "b1", to: { parentId: "sec1", container: "right", index: 2 } }, testRegistry);
        expect(next.blocks.sec1.children.right).toEqual(["b2", "b1"]);
    });

    it("rejects moving the root, canDrag: false blocks, and accepts violations", () => {
        const doc = exampleDoc();
        expect(() => moveBlock(doc, { id: "root", to: { parentId: "sec1", container: "left", index: 0 } }, testRegistry)).toThrow(/has no parent/);

        const withLocked = exampleDoc();
        withLocked.blocks.root.children.main.push("lock1");
        withLocked.blocks.lock1 = block({ id: "lock1", type: "locked" });
        expect(() =>
            moveBlock(withLocked, { id: "lock1", to: { parentId: "root", container: "main", index: 0 } }, testRegistry),
        ).toThrow(/cannot be moved/);

        const withStrict = exampleDoc();
        withStrict.blocks.root.children.main.push("strict1");
        withStrict.blocks.strict1 = block({ id: "strict1", type: "strict", children: { items: [] } });
        expect(() =>
            moveBlock(withStrict, { id: "b1", to: { parentId: "strict1", container: "items", index: 0 } }, testRegistry),
        ).toThrow(/does not accept type "button"/);
    });

    it("rejects moving a block into its own subtree", () => {
        const doc: BuilderDocument = {
            version: 1,
            rootId: "root",
            blocks: {
                root: block({ id: "root", type: "root", children: { main: ["s1"] } }),
                s1: block({ id: "s1", type: "section", children: { body: ["s2"] } }),
                s2: block({ id: "s2", type: "section", children: { body: [] } }),
            },
        };
        expect(() => moveBlock(doc, { id: "s1", to: { parentId: "s2", container: "body", index: 0 } }, testRegistry)).toThrow(/own subtree/);
        expect(() => moveBlock(doc, { id: "s1", to: { parentId: "s1", container: "body", index: 0 } }, testRegistry)).toThrow(/own subtree/);

        expect(canDropAt(doc, testRegistry, "section", { parentId: "s2", container: "body", index: 0 }, "s1")).toBe(false);
        expect(canDropAt(doc, testRegistry, "section", { parentId: "root", container: "main", index: 1 }, "s2")).toBe(true);
    });
});

describe("updateProps", () => {
    it("shallow-merges the patch", () => {
        const doc = exampleDoc();
        const next = updateProps(doc, { id: "sec1", patch: { gap: 24 } });

        expect(next.blocks.sec1.props).toEqual({ gap: 24 });
        const withMore = updateProps(next, { id: "sec1", patch: { align: "center" } });
        expect(withMore.blocks.sec1.props).toEqual({ gap: 24, align: "center" });
        expect(doc.blocks.sec1.props).toEqual({ gap: 16 });
    });

    it("throws for unknown blocks", () => {
        expect(() => updateProps(exampleDoc(), { id: "ghost", patch: {} })).toThrow(/does not exist/);
    });
});

describe("removeBlock", () => {
    it("removes the whole subtree and the parent reference", () => {
        const doc = exampleDoc();
        const next = removeBlock(doc, { id: "sec1" }, testRegistry);

        expect(Object.keys(next.blocks)).toEqual(["root"]);
        expect(next.blocks.root.children.main).toEqual([]);
        expect(Object.keys(doc.blocks)).toHaveLength(4);
        expect(validateDocument(next, testRegistry)).toEqual([]);
    });

    it("refuses the root, canDelete: false blocks, and unknown ids", () => {
        const doc = exampleDoc();
        expect(() => removeBlock(doc, { id: "root" }, testRegistry)).toThrow(/cannot remove the root/);
        expect(() => removeBlock(doc, { id: "ghost" }, testRegistry)).toThrow(/does not exist/);

        doc.blocks.root.children.main.push("lock1");
        doc.blocks.lock1 = block({ id: "lock1", type: "locked" });
        expect(() => removeBlock(doc, { id: "lock1" }, testRegistry)).toThrow(/cannot be deleted/);
    });
});

describe("duplicateBlock", () => {
    it("deep-clones the subtree with fresh ids, inserted after the source", () => {
        const doc = exampleDoc();
        const { document: next, blockId } = duplicateBlock(doc, { id: "sec1" }, testRegistry);

        expect(blockId).not.toBe("sec1");
        expect(next.blocks.root.children.main).toEqual(["sec1", blockId]);
        expect(Object.keys(next.blocks)).toHaveLength(7);

        const clone = next.blocks[blockId];
        expect(clone.type).toBe("columns");
        const cloneText = next.blocks[clone.children.left[0]];
        expect(clone.children.left[0]).not.toBe("t1");
        expect(cloneText.props).toEqual(doc.blocks.t1.props);
        expect(cloneText.props).not.toBe(doc.blocks.t1.props);
        expect(validateDocument(next, testRegistry)).toEqual([]);
    });

    it("refuses the root and full containers", () => {
        const doc = exampleDoc();
        expect(() => duplicateBlock(doc, { id: "root" }, testRegistry)).toThrow(/has no parent/);

        doc.blocks.sec1.children.right.push("b2");
        doc.blocks.b2 = block({ id: "b2", type: "button" });
        expect(() => duplicateBlock(doc, { id: "b1" }, testRegistry)).toThrow(/is full/);
    });
});

describe("setDocument", () => {
    it("returns a valid current-version document unchanged", () => {
        const doc = exampleDoc();
        expect(setDocument(doc, testRegistry)).toBe(doc);
    });

    it("tolerates unknown block types (warnings only)", () => {
        const doc = exampleDoc();
        doc.blocks.t1 = { ...doc.blocks.t1, type: "legacy-text" };
        expect(setDocument(doc, testRegistry)).toBe(doc);
    });

    it("repairs integrity errors instead of refusing the document", () => {
        const orphaned = exampleDoc();
        orphaned.blocks.stray = block({ id: "stray", type: "text" });
        const loaded = setDocument(orphaned, testRegistry);
        expect(loaded.blocks.stray).toBeUndefined();
        expect(validateDocument(loaded, testRegistry)).toEqual([]);
    });

    it("throws on unbridgeable versions and on a missing root", () => {
        expect(() => setDocument({ ...exampleDoc(), version: 99 }, testRegistry)).toThrow(/newer/);
        expect(() => setDocument({ ...exampleDoc(), rootId: "ghost" }, testRegistry)).toThrow(/cannot be loaded/);
    });
});
