import { describe, expect, it } from "vitest";
import { defineBlock } from "./define-block.ts";
import type { BuilderDocument } from "./types.ts";

describe("defineBlock", () => {
    it("returns the definition unchanged", () => {
        const definition = defineBlock<{ text: string }>({
            type: "text",
            label: "Text",
            defaultProps: { text: "Hello" },
            editRender: () => null,
        });

        expect(definition.type).toBe("text");
        expect(definition.defaultProps).toEqual({ text: "Hello" });
    });
});

describe("BuilderDocument shape", () => {
    it("models children per named container", () => {
        const doc: BuilderDocument = {
            version: 1,
            rootId: "root",
            blocks: {
                root: { id: "root", type: "email-root", props: {}, children: { main: ["sec1"] } },
                sec1: { id: "sec1", type: "columns", props: {}, children: { left: [], right: [] } },
            },
        };

        expect(doc.blocks[doc.rootId].children.main).toContain("sec1");
    });
});
