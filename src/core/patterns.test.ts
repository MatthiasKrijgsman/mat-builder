import { describe, expect, it } from "vitest";
import { insertBlock } from "./commands.ts";
import { definePattern, specFromSubtree } from "./patterns.ts";
import { block, exampleDoc, testRegistry } from "./test-fixtures.ts";
import type { BuilderDocument, NewBlockSpec } from "./types.ts";

/*
 * Patterns — docs/08 §7. The contract under test is that a pattern insert
 * leaves NO trace of the pattern in the document: what lands is ordinary
 * blocks with fresh ids, indistinguishable from ones dragged in one by one.
 */

const at = { parentId: "root", container: "main", index: 0 };

const heroPattern = definePattern({
    id: "hero",
    label: "Hero",
    spec: {
        type: "section",
        props: { padding: 48 },
        children: {
            body: [
                { type: "text", props: { text: "Big claim" } },
                { type: "button", props: { label: "Get started" } },
            ],
        },
    },
});

/** The subtree rooted at `id`, as plain shapes — ids dropped so two
 * materializations of the same spec compare equal. */
function shapeOf(document: BuilderDocument, id: string): unknown {
    const node = document.blocks[id];
    return {
        type: node.type,
        props: node.props,
        visibility: node.visibility,
        children: Object.fromEntries(
            Object.entries(node.children).map(([container, ids]) => [
                container,
                ids.map((childId) => shapeOf(document, childId)),
            ]),
        ),
    };
}

describe("insertBlock with a spec subtree", () => {
    it("materializes the whole tree in one command", () => {
        const { document, blockId } = insertBlock(
            exampleDoc(),
            { ...heroPattern.spec, at },
            testRegistry,
        );

        const section = document.blocks[blockId];
        expect(section.type).toBe("section");
        expect(section.props.padding).toBe(48);
        const [textId, buttonId] = section.children.body;
        expect(document.blocks[textId].props.text).toBe("Big claim");
        expect(document.blocks[buttonId].props.label).toBe("Get started");
    });

    it("gives every insert fresh ids, so two stamps never alias", () => {
        const first = insertBlock(exampleDoc(), { ...heroPattern.spec, at }, testRegistry);
        const second = insertBlock(first.document, { ...heroPattern.spec, at }, testRegistry);

        const ids = (document: BuilderDocument, id: string): string[] => [
            id,
            ...Object.values(document.blocks[id].children).flat().flatMap((child) => ids(document, child)),
        ];
        const a = ids(second.document, first.blockId);
        const b = ids(second.document, second.blockId);
        expect(a).toHaveLength(3);
        expect(new Set([...a, ...b]).size).toBe(6);
        // Same shape, different identity — that is the whole promise
        expect(shapeOf(second.document, first.blockId)).toEqual(shapeOf(second.document, second.blockId));
    });

    it("fills unspecified props from the definition's defaults", () => {
        const spec: NewBlockSpec = { type: "section", children: { body: [{ type: "text" }] } };
        const { document, blockId } = insertBlock(exampleDoc(), { ...spec, at }, testRegistry);
        expect(document.blocks[blockId].props.padding).toBe(16);
        expect(document.blocks[document.blocks[blockId].children.body[0]].props.text).toBe("Hello");
    });

    it("carries per-node visibility, which is a node field and not a prop", () => {
        const spec: NewBlockSpec = {
            type: "section",
            children: {
                body: [{ type: "text", visibility: { mode: "rules", match: "all", rules: [{ token: "{{vip}}", operator: "exists" }] } }],
            },
        };
        const { document, blockId } = insertBlock(exampleDoc(), { ...spec, at }, testRegistry);
        const childId = document.blocks[blockId].children.body[0];
        expect(document.blocks[childId].visibility?.rules).toHaveLength(1);
        // The parent said nothing, so it stays unconditional
        expect(document.blocks[blockId].visibility).toBeUndefined();
    });

    it("still enforces drop rules against the spec's ROOT type", () => {
        // `strict` accepts only text, so a section-rooted pattern is refused
        const document = {
            ...exampleDoc(),
            blocks: { ...exampleDoc().blocks, s1: block({ id: "s1", type: "strict", children: { items: [] } }) },
        };
        expect(() =>
            insertBlock(document, { ...heroPattern.spec, at: { parentId: "s1", container: "items", index: 0 } }, testRegistry),
        ).toThrow(/does not accept type "section"/);
    });

    it("refuses a spec naming an unregistered type, at any depth", () => {
        const spec: NewBlockSpec = { type: "section", children: { body: [{ type: "not-a-block" }] } };
        expect(() => insertBlock(exampleDoc(), { ...spec, at }, testRegistry)).toThrow(/unknown type "not-a-block"/);
    });
});

describe("specFromSubtree", () => {
    it("round-trips a subtree: extract, re-insert, same shape", () => {
        // Start from a MATERIALIZED subtree, not the hand-built fixture: only
        // then do both sides carry the definitions' default props, so any
        // difference is the round-trip's fault rather than the fixture's.
        const seeded = insertBlock(exampleDoc(), { ...heroPattern.spec, at }, testRegistry);
        const spec = specFromSubtree(seeded.document, seeded.blockId);
        expect(spec).not.toBeNull();

        const { document, blockId } = insertBlock(seeded.document, { ...spec!, at }, testRegistry);
        expect(shapeOf(document, blockId)).toEqual(shapeOf(seeded.document, seeded.blockId));
    });

    it("re-materializes props the source node never stored, from defaults", () => {
        // The fixture's `sec1` has empty props; a spec taken from it and
        // re-inserted picks the definition's defaults back up.
        const spec = specFromSubtree(exampleDoc(), "sec1")!;
        const { document, blockId } = insertBlock(exampleDoc(), { ...spec, at }, testRegistry);
        expect(document.blocks[blockId].props).toEqual({ gap: 16 });
    });

    it("keeps visibility so a saved pattern does not lose its conditions", () => {
        const source = exampleDoc();
        source.blocks.t1.visibility = { mode: "rules", match: "any", rules: [{ token: "{{name}}", operator: "exists" }] };
        const spec = specFromSubtree(source, "sec1");
        expect(spec?.children?.left[0].visibility?.rules).toHaveLength(1);
    });

    it("does not alias the source document's props", () => {
        const source = exampleDoc();
        const spec = specFromSubtree(source, "t1")!;
        (spec.props as { text: string }).text = "changed";
        expect(source.blocks.t1.props.text).toBe("Hello");
    });

    it("omits empty containers, so a spec carries no noise", () => {
        const source = exampleDoc();
        source.blocks.sec1.children.right = [];
        const spec = specFromSubtree(source, "sec1");
        expect(Object.keys(spec!.children!)).toEqual(["left"]);
    });

    it("returns null for a missing block", () => {
        expect(specFromSubtree(exampleDoc(), "nope")).toBeNull();
    });
});
