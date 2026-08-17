import { describe, expect, it } from "vitest";
import { block, exampleDoc } from "../core/test-fixtures.ts";
import type { BlockId, BuilderDocument } from "../core/types.ts";
import { adjacentVisibleRow, visibleLayerRows } from "./layer-tree.ts";

/*
 * exampleDoc: root(main: [sec1]) → sec1 columns(left: [t1], right: [b1]),
 * so the panel shows root, sec1, t1, b1 — one only child, then a block whose
 * two children live in different containers.
 */
const all = (document: BuilderDocument): Set<BlockId> => new Set(Object.keys(document.blocks));

describe("visibleLayerRows", () => {
    it("lists rows in render order: depth-first, container by container", () => {
        const document = exampleDoc();
        expect(visibleLayerRows(document, all(document))).toEqual(["root", "sec1", "t1", "b1"]);
    });

    it("prunes a collapsed block's subtree", () => {
        const document = exampleDoc();
        const expanded = all(document);
        expanded.delete("sec1");
        expect(visibleLayerRows(document, expanded)).toEqual(["root", "sec1"]);
        expect(visibleLayerRows(document, new Set())).toEqual(["root"]);
    });
});

describe("adjacentVisibleRow", () => {
    it("crosses nesting levels instead of dead-ending on an only child", () => {
        const document = exampleDoc();
        const expanded = all(document);
        // sec1 is root's only child: sibling navigation had nowhere to go here
        expect(adjacentVisibleRow(document, expanded, "root", 1)).toBe("sec1");
        expect(adjacentVisibleRow(document, expanded, "sec1", 1)).toBe("t1");
        // ...and out of the "left" container into "right"
        expect(adjacentVisibleRow(document, expanded, "t1", 1)).toBe("b1");
        // back up the other way
        expect(adjacentVisibleRow(document, expanded, "b1", -1)).toBe("t1");
        expect(adjacentVisibleRow(document, expanded, "sec1", -1)).toBe("root");
    });

    it("stops at both ends rather than wrapping", () => {
        const document = exampleDoc();
        const expanded = all(document);
        expect(adjacentVisibleRow(document, expanded, "root", -1)).toBeNull();
        expect(adjacentVisibleRow(document, expanded, "b1", 1)).toBeNull();
    });

    it("skips the children of a collapsed block", () => {
        const document = exampleDoc();
        const expanded = all(document);
        expanded.delete("sec1");
        expect(adjacentVisibleRow(document, expanded, "sec1", 1)).toBeNull();
        expect(adjacentVisibleRow(document, expanded, "sec1", -1)).toBe("root");
    });

    it("steps from the nearest visible ancestor when the selected row is hidden", () => {
        // Collapsing sec1 while t1 stays selected: t1 has no row of its own,
        // so the move happens from the row standing in for it (sec1)
        const document = exampleDoc();
        const expanded = all(document);
        expanded.delete("sec1");
        expect(adjacentVisibleRow(document, expanded, "t1", -1)).toBe("root");
        expect(adjacentVisibleRow(document, expanded, "t1", 1)).toBeNull();
    });

    it("returns null for a block that is not in the document at all", () => {
        const document = exampleDoc();
        expect(adjacentVisibleRow(document, all(document), "ghost", 1)).toBeNull();
    });

    it("ignores containers with no children", () => {
        const document = exampleDoc();
        document.blocks.sec1 = block({ id: "sec1", type: "columns", children: { left: [], right: ["b1"] } });
        delete document.blocks.t1;
        expect(visibleLayerRows(document, all(document))).toEqual(["root", "sec1", "b1"]);
        expect(adjacentVisibleRow(document, all(document), "sec1", 1)).toBe("b1");
    });
});
