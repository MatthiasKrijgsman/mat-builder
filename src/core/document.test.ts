import { describe, expect, it } from "vitest";
import { createDocument, DOCUMENT_VERSION, loadDocument, migrateDocument, validateDocument } from "./document.ts";
import { block, exampleDoc, testRegistry } from "./test-fixtures.ts";
import type { BuilderDocument } from "./types.ts";

describe("createDocument", () => {
    it("creates a root block from defaultProps with initialized containers", () => {
        const doc = createDocument(testRegistry, "root");

        expect(doc.version).toBe(DOCUMENT_VERSION);
        const root = doc.blocks[doc.rootId];
        expect(root).toBeDefined();
        expect(root.type).toBe("root");
        expect(root.props).toEqual({ backgroundColor: "#ffffff" });
        expect(root.children).toEqual({ main: [] });
        expect(validateDocument(doc, testRegistry)).toEqual([]);
    });

    it("merges rootProps over the defaults", () => {
        const doc = createDocument(testRegistry, "root", { backgroundColor: "#000000" });
        expect(doc.blocks[doc.rootId].props).toEqual({ backgroundColor: "#000000" });
    });

    it("runs onCreate: props patch + self-populated children", () => {
        const doc = createDocument(testRegistry, "prefilled");

        const root = doc.blocks[doc.rootId];
        expect(root.props.note).toBe("created as root");
        expect(root.children.items).toHaveLength(1);
        const child = doc.blocks[root.children.items[0]];
        expect(child.type).toBe("text");
        expect(child.props).toEqual({ text: "Prefilled child" });
        expect(validateDocument(doc, testRegistry)).toEqual([]);
    });

    it("throws on unknown root types", () => {
        expect(() => createDocument(testRegistry, "nope")).toThrow(/unknown type "nope"/);
    });
});

describe("migrateDocument", () => {
    it("passes a current-version document through unchanged", () => {
        const doc = exampleDoc();
        expect(migrateDocument(doc)).toBe(doc);
    });

    it("throws on documents newer than the supported version", () => {
        expect(() => migrateDocument({ ...exampleDoc(), version: DOCUMENT_VERSION + 1 })).toThrow(/newer/);
    });

    it("throws when no migration bridges an old version", () => {
        expect(() => migrateDocument({ ...exampleDoc(), version: 0 })).toThrow(/no migration/);
    });
});

describe("validateDocument", () => {
    it("passes the valid example document", () => {
        expect(validateDocument(exampleDoc(), testRegistry)).toEqual([]);
    });

    const codesOf = (doc: ReturnType<typeof exampleDoc>) =>
        validateDocument(doc, testRegistry).map((issue) => issue.code);

    it("reports a missing root", () => {
        const doc = exampleDoc();
        doc.rootId = "ghost";
        expect(codesOf(doc)).toContain("missing-root");
    });

    it("reports the root appearing as a child", () => {
        const doc = exampleDoc();
        doc.blocks.sec1.children.left.push("root");
        expect(codesOf(doc)).toContain("root-is-child");
    });

    it("reports dangling child ids", () => {
        const doc = exampleDoc();
        doc.blocks.root.children.main.push("ghost");
        expect(codesOf(doc)).toContain("dangling-child-id");
    });

    it("reports orphan blocks", () => {
        const doc = exampleDoc();
        doc.blocks.stray = block({ id: "stray", type: "text" });
        expect(codesOf(doc)).toContain("orphan-block");
    });

    it("reports blocks referenced by multiple parents", () => {
        const doc = exampleDoc();
        doc.blocks.sec1.children.right.push("t1");
        expect(codesOf(doc)).toContain("multiple-parents");
    });

    it("reports a key/id mismatch", () => {
        const doc = exampleDoc();
        doc.blocks.t1 = { ...doc.blocks.t1, id: "other" };
        expect(codesOf(doc)).toContain("id-mismatch");
    });

    it("reports container names missing from the definition", () => {
        const doc = exampleDoc();
        doc.blocks.root.children.bogus = [];
        expect(codesOf(doc)).toContain("unknown-container");
    });

    it("reports accepts violations (array and function form)", () => {
        const doc = exampleDoc();
        doc.blocks.root.children.main.push("s1", "strict1");
        doc.blocks.s1 = block({ id: "s1", type: "section", children: { body: ["lock1"] } });
        doc.blocks.lock1 = block({ id: "lock1", type: "locked" });
        doc.blocks.strict1 = block({ id: "strict1", type: "strict", children: { items: ["btn2"] } });
        doc.blocks.btn2 = block({ id: "btn2", type: "button" });

        const issues = validateDocument(doc, testRegistry);
        const violations = issues.filter((issue) => issue.code === "accepts-violation");
        expect(violations.map((issue) => issue.blockId).sort()).toEqual(["btn2", "lock1"]);
    });

    it("reports maxChildren overflows", () => {
        const doc = exampleDoc();
        doc.blocks.sec1.children.right.push("b2", "b3");
        doc.blocks.b2 = block({ id: "b2", type: "button" });
        doc.blocks.b3 = block({ id: "b3", type: "button" });
        expect(codesOf(doc)).toContain("max-children-exceeded");
    });

    it("tolerates unknown block types as a warning and skips their container checks", () => {
        const doc = exampleDoc();
        doc.blocks.sec1 = { ...doc.blocks.sec1, type: "legacy-columns" };

        const issues = validateDocument(doc, testRegistry);
        expect(issues).toEqual([
            expect.objectContaining({ code: "unknown-type", severity: "warning", blockId: "sec1" }),
        ]);
    });
});

describe("loadDocument — a stored document is repaired, not refused", () => {
    const codes = (issues: { code: string }[]) => issues.map((issue) => issue.code).sort();

    it("drops dangling child ids and orphans, reporting each", () => {
        const doc = exampleDoc();
        doc.blocks.sec1.children.left.push("ghost");
        doc.blocks.stray = block({ id: "stray", type: "text" });
        const { document, issues } = loadDocument(doc, testRegistry);
        expect(document.blocks.sec1.children.left).toEqual(["t1"]);
        expect(document.blocks.stray).toBeUndefined();
        expect(codes(issues)).toEqual(["dangling-child-id", "orphan-block"]);
        expect(validateDocument(document, testRegistry)).toEqual([]);
    });

    it("backfills defaultProps on known types and adds the containers they lack", () => {
        const doc = exampleDoc();
        doc.blocks.t1 = { id: "t1", type: "text", props: {}, children: {} };
        doc.blocks.sec1.children = { left: ["t1"] };
        delete doc.blocks.b1;
        const { document, issues } = loadDocument(doc, testRegistry);
        expect(document.blocks.t1.props).toEqual({ text: "Hello" });
        expect(document.blocks.sec1.children).toEqual({ left: ["t1"], right: [] });
        expect(issues).toEqual([]);
    });

    it("keeps a stored prop over its default, and backfills the rest", () => {
        const { document, issues } = loadDocument(exampleDoc(), testRegistry);
        expect(document.blocks.b1.props).toEqual({ label: "Buy" });
        expect(document.blocks.root.props).toEqual({ backgroundColor: "#ffffff" });
        expect(document.blocks.sec1.props).toEqual({ gap: 16 });
        expect(issues).toEqual([]);
    });

    it("returns the very same document when nothing had to change", () => {
        const complete = createDocument(testRegistry, "prefilled");
        const { document, issues } = loadDocument(complete, testRegistry);
        expect(document).toBe(complete);
        expect(issues).toEqual([]);
        // Unchanged nodes keep their identity even when a sibling was repaired
        const doc = exampleDoc();
        doc.blocks.stray = block({ id: "stray", type: "text" });
        const repaired = loadDocument(doc, testRegistry).document;
        expect(repaired).not.toBe(doc);
        expect(repaired.blocks.b1).toBe(doc.blocks.b1);
    });

    it("normalizes a missing version and a node without children", () => {
        const doc = exampleDoc() as unknown as Record<string, unknown>;
        delete doc.version;
        delete (doc.blocks as Record<string, Record<string, unknown>>).t1.children;
        const { document, issues } = loadDocument(doc as unknown as BuilderDocument, testRegistry);
        expect(document.version).toBe(DOCUMENT_VERSION);
        expect(document.blocks.t1.children).toEqual({});
        expect(codes(issues)).toEqual(["invalid-version"]);
    });

    it("keeps the key over a mismatched id, drops second parents and root references", () => {
        const doc = exampleDoc();
        doc.blocks.t1.id = "other";
        doc.blocks.sec1.children.right.push("t1", "root");
        const { document, issues } = loadDocument(doc, testRegistry);
        expect(document.blocks.t1.id).toBe("t1");
        expect(document.blocks.sec1.children.right).toEqual(["b1"]);
        expect(codes(issues)).toEqual(["id-mismatch", "multiple-parents", "root-is-child"]);
        expect(validateDocument(document, testRegistry)).toEqual([]);
    });

    it("drops children a container does not accept or has no room for", () => {
        const doc = exampleDoc();
        // strict.items accepts only text; columns.right holds at most 2
        doc.blocks.s1 = block({ id: "s1", type: "strict", children: { items: ["b2"] } });
        doc.blocks.b2 = block({ id: "b2", type: "button" });
        doc.blocks.t2 = block({ id: "t2", type: "text" });
        doc.blocks.sec1.children.right.push("s1", "t2");
        const { document, issues } = loadDocument(doc, testRegistry);
        expect(document.blocks.s1.children.items).toEqual([]);
        expect(document.blocks.b2).toBeUndefined();
        expect(document.blocks.sec1.children.right).toEqual(["b1", "s1"]);
        expect(document.blocks.t2).toBeUndefined();
        expect(codes(issues)).toEqual(["accepts-violation", "max-children-exceeded", "orphan-block", "orphan-block"]);
        expect(validateDocument(document, testRegistry)).toEqual([]);
    });

    it("drops containers a known type does not have, and keeps unknown types as they are", () => {
        const doc = exampleDoc();
        doc.blocks.t1.children = { extra: ["b1"] };
        doc.blocks.b1 = { ...doc.blocks.b1, type: "legacy-button", children: { anything: ["t9"] } };
        doc.blocks.t9 = block({ id: "t9", type: "text" });
        const { document, issues } = loadDocument(doc, testRegistry);
        expect(document.blocks.t1.children).toEqual({});
        expect(document.blocks.b1.children).toEqual({ anything: ["t9"] });
        expect(document.blocks.b1.props).toEqual({ label: "Buy" });
        expect(document.blocks.t9.props).toEqual({ text: "Hello" });
        expect(codes(issues)).toEqual(["unknown-container", "unknown-type"]);
    });

    it("refuses only what it cannot rebuild", () => {
        expect(() => loadDocument({ rootId: "root" } as unknown as BuilderDocument, testRegistry)).toThrow(
            /Not a builder document/,
        );
        expect(() => loadDocument({ ...exampleDoc(), rootId: "ghost" }, testRegistry)).toThrow(/cannot be loaded/);
        expect(() => loadDocument({ ...exampleDoc(), version: DOCUMENT_VERSION + 1 }, testRegistry)).toThrow(/newer/);
    });
});
