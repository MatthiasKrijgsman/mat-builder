import { describe, expect, it } from "vitest";
import { createDocument, DOCUMENT_VERSION, migrateDocument, validateDocument } from "./document.ts";
import { block, exampleDoc, testRegistry } from "./test-fixtures.ts";

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
