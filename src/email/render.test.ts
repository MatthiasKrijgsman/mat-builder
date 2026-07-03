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

    it("renders columns, heading, image, divider and spacer", async () => {
        let document = buildDemoEmail();
        const root = document.rootId;

        const cols = insertBlock(document, { type: "columns", at: { parentId: root, container: "main", index: 1 } }, registry);
        document = cols.document;
        const heading = insertBlock(
            document,
            { type: "heading", at: { parentId: cols.blockId, container: "col-1", index: 0 } },
            registry,
        );
        document = updateProps(heading.document, { id: heading.blockId, patch: { text: "Column heading" } });
        const image = insertBlock(
            document,
            { type: "image", at: { parentId: cols.blockId, container: "col-2", index: 0 } },
            registry,
        );
        document = updateProps(image.document, {
            id: image.blockId,
            patch: { src: "https://example.com/pic.png", alt: "A picture", href: "https://example.com/target" },
        });
        const sectionId = document.blocks[root].children.main[0];
        document = insertBlock(document, { type: "divider", at: { parentId: sectionId, container: "content", index: 0 } }, registry).document;
        document = insertBlock(document, { type: "spacer", at: { parentId: sectionId, container: "content", index: 0 } }, registry).document;

        expect(validateDocument(document, registry)).toEqual([]);
        const { html } = await renderEmail(document);

        expect(html).toContain("Column heading");
        expect(html).toMatch(/<h2[^>]*>[\s\S]*Column heading/);
        expect(html).toContain("width:50%"); // two active columns from the 50/50 preset
        expect(html).toContain('src="https://example.com/pic.png"');
        expect(html).toContain('href="https://example.com/target"');
        expect(html).toContain("border-top:1px solid #e4e4e7"); // divider
        expect(html).toContain("height:24px"); // spacer
    });

    it("renders nested sections and columns inside sections", async () => {
        let document = buildDemoEmail();
        const outerSection = document.blocks[document.rootId].children.main[0];

        const inner = insertBlock(
            document,
            { type: "section", at: { parentId: outerSection, container: "content", index: 0 } },
            registry,
        );
        document = inner.document;
        const innerText = insertBlock(
            document,
            { type: "text", at: { parentId: inner.blockId, container: "content", index: 0 } },
            registry,
        );
        document = updateProps(innerText.document, { id: innerText.blockId, patch: { text: "Nested section copy" } });
        document = insertBlock(
            document,
            { type: "columns", at: { parentId: outerSection, container: "content", index: 1 } },
            registry,
        ).document;

        expect(validateDocument(document, registry)).toEqual([]);
        const { html } = await renderEmail(document);
        expect(html).toContain("Nested section copy");
        expect(html).toContain("width:50%"); // columns rendered from inside the section
    });

    it("images without a src render nothing", async () => {
        let document = buildDemoEmail();
        const sectionId = document.blocks[document.rootId].children.main[0];
        document = insertBlock(
            document,
            { type: "image", at: { parentId: sectionId, container: "content", index: 0 } },
            registry,
        ).document;

        const { html } = await renderEmail(document);
        expect(html).toContain("Hello from mat-builder");
        expect(html).not.toContain("<img");
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
