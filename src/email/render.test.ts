import { describe, expect, it } from "vitest";
import { insertBlock, updateProps } from "../core/commands.ts";
import { createDocument, validateDocument } from "../core/document.ts";
import { createRegistry } from "../core/registry.ts";
import type { BuilderDocument } from "../core/types.ts";
import { emailBlocks } from "./index.tsx";
import { buildEmailTree, renderEmail } from "./render.ts";

const registry = createRegistry(emailBlocks);

/** email-root > section > (text, button) built through the real preset + commands. */
function buildDemoEmail(): BuilderDocument {
    let document = createDocument(registry, "email-root", { previewText: "Preview snippet" });
    const root = document.rootId;

    const section = insertBlock(document, { type: "section", at: { parentId: root, container: "main", index: 0 } }, registry);
    document = section.document;
    const text = insertBlock(
        document,
        { type: "text", at: { parentId: section.blockId, container: "content", index: 0 } },
        registry,
    );
    document = updateProps(text.document, { id: text.blockId, patch: { text: "Hello from mat-builder" } });
    const button = insertBlock(
        document,
        { type: "button", at: { parentId: section.blockId, container: "content", index: 1 } },
        registry,
    );
    document = updateProps(button.document, {
        id: button.blockId,
        patch: { label: "Buy now", href: "https://example.com/buy" },
    });
    return document;
}

describe("email preset", () => {
    it("produces documents that pass validation", () => {
        expect(validateDocument(buildDemoEmail(), registry)).toEqual([]);
    });
});

describe("renderEmail", () => {
    it("renders the full document to html and plain text", async () => {
        const { html, text } = await renderEmail(buildDemoEmail());

        expect(html).toContain("<html");
        expect(html).toContain("Hello from mat-builder");
        expect(html).toContain("Buy now");
        expect(html).toContain('href="https://example.com/buy"');
        expect(html).toContain("Preview snippet");
        // Table-based layout (react-email Container/Section), not flex
        expect(html).toContain("<table");
        expect(html).not.toContain("display:flex");

        expect(text).toContain("Hello from mat-builder");
        expect(text).toContain("Buy now");
        expect(text).not.toContain("<html");
    });

    it("skips unknown block types instead of crashing", async () => {
        const document = structuredClone(buildDemoEmail()); // commands freeze their output

        const sectionId = document.blocks[document.rootId].children.main[0];
        document.blocks.legacy = { id: "legacy", type: "legacy-hero", props: {}, children: {} };
        document.blocks[sectionId] = {
            ...document.blocks[sectionId],
            children: { content: [...document.blocks[sectionId].children.content, "legacy"] },
        };

        const { html } = await renderEmail(document);
        expect(html).toContain("Hello from mat-builder");
        expect(html).not.toContain("legacy-hero");
    });

    it("throws when the root has no renderer", async () => {
        const document = structuredClone(buildDemoEmail());
        document.blocks[document.rootId] = { ...document.blocks[document.rootId], type: "custom-root" };
        await expect(renderEmail(document)).rejects.toThrow(/no email renderer/);
    });

    it("buildEmailTree returns null for missing ids", () => {
        expect(buildEmailTree(buildDemoEmail(), "ghost")).toBeNull();
    });
});
