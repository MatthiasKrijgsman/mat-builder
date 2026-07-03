import { describe, expect, it } from "vitest";
import { block, exampleDoc } from "./test-fixtures.ts";
import { findAncestors, findLocation, isDescendant, walkDocument, type WalkContext } from "./traversal.ts";

describe("walkDocument", () => {
    it("visits depth-first with location context", () => {
        const visits: Array<{ id: string } & WalkContext> = [];
        walkDocument(exampleDoc(), (node, ctx) => {
            visits.push({ id: node.id, ...ctx });
        });

        expect(visits.map((v) => v.id)).toEqual(["root", "sec1", "t1", "b1"]);
        expect(visits[0]).toEqual({ id: "root", parentId: null, container: null, index: 0, depth: 0 });
        expect(visits[2]).toEqual({ id: "t1", parentId: "sec1", container: "left", index: 0, depth: 2 });
        expect(visits[3]).toEqual({ id: "b1", parentId: "sec1", container: "right", index: 0, depth: 2 });
    });

    it("prunes a subtree when the visitor returns false", () => {
        const visited: string[] = [];
        walkDocument(exampleDoc(), (node) => {
            visited.push(node.id);
            return node.id !== "sec1";
        });
        expect(visited).toEqual(["root", "sec1"]);
    });

    it("skips dangling child ids and a missing root", () => {
        const doc = exampleDoc();
        doc.blocks.sec1.children.left.push("ghost");
        const visited: string[] = [];
        walkDocument(doc, (node) => {
            visited.push(node.id);
        });
        expect(visited).toEqual(["root", "sec1", "t1", "b1"]);

        expect(() => walkDocument({ version: 1, rootId: "nope", blocks: {} }, () => {})).not.toThrow();
    });
});

describe("findLocation", () => {
    it("returns the parent/container/index of a block", () => {
        expect(findLocation(exampleDoc(), "t1")).toEqual({ parentId: "sec1", container: "left", index: 0 });
        expect(findLocation(exampleDoc(), "sec1")).toEqual({ parentId: "root", container: "main", index: 0 });
    });

    it("returns null for the root and unknown ids", () => {
        expect(findLocation(exampleDoc(), "root")).toBeNull();
        expect(findLocation(exampleDoc(), "ghost")).toBeNull();
    });
});

describe("findAncestors", () => {
    it("returns the chain nearest-parent-first up to the root", () => {
        expect(findAncestors(exampleDoc(), "t1")).toEqual(["sec1", "root"]);
        expect(findAncestors(exampleDoc(), "sec1")).toEqual(["root"]);
    });

    it("returns [] for the root and unknown ids", () => {
        expect(findAncestors(exampleDoc(), "root")).toEqual([]);
        expect(findAncestors(exampleDoc(), "ghost")).toEqual([]);
    });

    it("survives a corrupt parent cycle", () => {
        const doc = exampleDoc();
        doc.blocks.a = block({ id: "a", type: "section", children: { body: ["b"] } });
        doc.blocks.b = block({ id: "b", type: "section", children: { body: ["a"] } });
        expect(findAncestors(doc, "a")).toEqual(["b", "a"]);
    });
});

describe("isDescendant", () => {
    it("is true for blocks strictly inside the ancestor's subtree", () => {
        expect(isDescendant(exampleDoc(), "root", "t1")).toBe(true);
        expect(isDescendant(exampleDoc(), "sec1", "b1")).toBe(true);
    });

    it("is false for reversed relations and for a block itself", () => {
        expect(isDescendant(exampleDoc(), "t1", "root")).toBe(false);
        expect(isDescendant(exampleDoc(), "t1", "t1")).toBe(false);
        expect(isDescendant(exampleDoc(), "t1", "b1")).toBe(false);
    });
});
