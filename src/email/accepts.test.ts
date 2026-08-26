import { describe, expect, it } from "vitest";
import { canDropAt, createRegistry, defineBlock, insertBlock } from "../core/index.ts";
import { emailBlocks, EMAIL_ROOT_TYPE } from "./preset.ts";
import { acceptsEmailContent, EMAIL_STRUCTURAL_TYPES } from "./accepts.ts";
import type { BuilderDocument } from "../core/types.ts";

/*
 * docs/08 §6 — the reason this rule exists is that a consumer's own block
 * must be droppable. That is what these assert, alongside the structural
 * guarantees the old allowlists were really protecting.
 */

const customBlock = defineBlock({
    type: "product-card",
    label: "Product card",
    defaultProps: {},
    editRender: () => null,
});

const registry = createRegistry([...emailBlocks, customBlock]);

/** root(main:[c1]) → container c1, plus a table with a row and a cell. */
function doc(): BuilderDocument {
    return {
        version: 1,
        rootId: "root",
        blocks: {
            root: { id: "root", type: EMAIL_ROOT_TYPE, props: {}, children: { main: ["c1"] } },
            c1: { id: "c1", type: "container", props: {}, children: { content: ["tb"] } },
            tb: { id: "tb", type: "table", props: {}, children: { rows: ["r1"] } },
            r1: { id: "r1", type: "table-row", props: {}, children: { cells: ["cell1"] } },
            cell1: { id: "cell1", type: "table-cell", props: {}, children: { content: [] } },
        },
    };
}

const into = (parentId: string, container: string) => ({ parentId, container, index: 0 });

describe("acceptsEmailContent", () => {
    it("admits every non-structural type, registered or not yet known", () => {
        for (const type of ["text", "button", "image", "container", "table", "product-card", "whatever"]) {
            expect(acceptsEmailContent(type)).toBe(true);
        }
    });

    it("refuses the structural parts", () => {
        for (const type of EMAIL_STRUCTURAL_TYPES) expect(acceptsEmailContent(type)).toBe(false);
    });
});

describe("dropping a consumer's own block", () => {
    it("lands in a container — the case the old allowlist made impossible", () => {
        expect(canDropAt(doc(), registry, "product-card", into("c1", "content"))).toBe(true);
    });

    it("lands at the top level of the email", () => {
        expect(canDropAt(doc(), registry, "product-card", into("root", "main"))).toBe(true);
    });

    it("lands in a table cell", () => {
        expect(canDropAt(doc(), registry, "product-card", into("cell1", "content"))).toBe(true);
    });
});

describe("structural guarantees the allowlists were protecting", () => {
    it("keeps rows out of containers and cells out of containers", () => {
        expect(canDropAt(doc(), registry, "table-row", into("c1", "content"))).toBe(false);
        expect(canDropAt(doc(), registry, "table-cell", into("c1", "content"))).toBe(false);
    });

    it("keeps a second root out of the document", () => {
        expect(canDropAt(doc(), registry, EMAIL_ROOT_TYPE, into("c1", "content"))).toBe(false);
    });

    it("still lets a table hold only rows, and a row only cells", () => {
        expect(canDropAt(doc(), registry, "table-row", into("tb", "rows"))).toBe(true);
        expect(canDropAt(doc(), registry, "text", into("tb", "rows"))).toBe(false);
        expect(canDropAt(doc(), registry, "table-cell", into("r1", "cells"))).toBe(true);
        expect(canDropAt(doc(), registry, "text", into("r1", "cells"))).toBe(false);
    });

    it("leaves the registration check where it already lived", () => {
        // Opening `accepts` does NOT make an unregistered type insertable:
        // canDropAt only answers "would this container take it", and it says
        // yes here because the rule is about structure, not registration.
        const withoutCustom = createRegistry([...emailBlocks]);
        expect(canDropAt(doc(), withoutCustom, "product-card", into("c1", "content"))).toBe(true);
        // Creation is refused one layer up: materializeBlock throws, and the
        // store's insertBlock returns null via registry.has (react/store.ts).
        expect(withoutCustom.has("product-card")).toBe(false);
        expect(() =>
            insertBlock(doc(), { type: "product-card", at: into("c1", "content") }, withoutCustom),
        ).toThrow(/unknown type "product-card"/);
    });
});
