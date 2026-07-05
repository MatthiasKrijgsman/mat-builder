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
        expect(html).toContain("padding:24px 12px"); // root paddingY/paddingX controls
        // Table-based layout (react-email Container/Section), not flex
        expect(html).toContain("<table");
        expect(html).not.toContain("display:flex");

        expect(text).toContain("Hello from mat-builder");
        expect(text).toContain("Buy now");
        expect(text).not.toContain("<html");
    });

    it("renders columns, image, divider and spacer", async () => {
        let document = buildDemoEmail();
        const root = document.rootId;

        const cols = insertBlock(document, { type: "columns", at: { parentId: root, container: "main", index: 1 } }, registry);
        document = cols.document;
        const headingText = insertBlock(
            document,
            { type: "text", at: { parentId: cols.blockId, container: "col-1", index: 0 } },
            registry,
        );
        document = updateProps(headingText.document, { id: headingText.blockId, patch: { text: "## Column heading" } });
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

    it("renders style groups (gradient, border, shadow, gap) into email-safe CSS", async () => {
        let document = buildDemoEmail();
        const sectionId = document.blocks[document.rootId].children.main[0];
        document = updateProps(document, {
            id: sectionId,
            patch: {
                background: {
                    type: "gradient",
                    color: "#ffffff",
                    gradient: { from: "#111111", to: "#222222", angle: 90 },
                },
                border: { width: 2, style: "solid", color: "#ff0000", radius: 8 },
                effects: {
                    opacity: 100,
                    shadow: { type: "drop", x: 0, y: 2, blur: 8, spread: 0, color: "#000000", opacity: 15 },
                },
                layout: { horizontal: "start", vertical: "start", gap: 12 },
            },
        });

        const { html } = await renderEmail(document);
        // Gradient plus its solid fallback for clients that ignore background-image
        expect(html).toContain("linear-gradient(90deg");
        expect(html).toMatch(/background-color:\s*#111111/i);
        expect(html).toContain("border:2px solid #ff0000");
        expect(html).toContain("border-radius:8px");
        expect(html).toMatch(/box-shadow:0px 2px 8px 0px rgba\(0,\s*0,\s*0,\s*0?\.15\)/);
        // Children gap = table-safe wrapper divs, never flex
        expect(html).toContain("padding-bottom:12px");
        expect(html).not.toContain("display:flex");
    });

    it("renders text-block markdown (bold, links) into the output", async () => {
        let document = buildDemoEmail();
        const sectionId = document.blocks[document.rootId].children.main[0];
        const textId = document.blocks[sectionId].children.content[0];
        document = updateProps(document, {
            id: textId,
            patch: { text: "Plain, **bold** and a [link](https://example.com/md)." },
        });

        const { html, text } = await renderEmail(document);
        expect(html).toMatch(/<strong[^>]*>bold<\/strong>/);
        expect(html).toContain('href="https://example.com/md"');
        expect(text).toContain("bold");
        expect(text).not.toContain("**"); // markdown is rendered, not passed through
    });

    it("renders markdown lists with explicit inline list styles", async () => {
        let document = buildDemoEmail();
        const sectionId = document.blocks[document.rootId].children.main[0];
        const textId = document.blocks[sectionId].children.content[0];
        document = updateProps(document, { id: textId, patch: { text: "- D\n- E\n- F" } });

        const { html } = await renderEmail(document);
        // Inline styles so bullets survive the canvas preflight and email-client resets alike
        expect(html).toMatch(/<ul[^>]*list-style-type:disc/);
        expect(html).toMatch(/<ul[^>]*padding-left:24px/);
        expect(html).toMatch(/<li[^>]*>[\s\S]*D/);
    });

    it("renders background images with sizing and a fallback color", async () => {
        let document = buildDemoEmail();
        const sectionId = document.blocks[document.rootId].children.main[0];
        document = updateProps(document, {
            id: sectionId,
            patch: {
                background: {
                    type: "image",
                    color: "#fafafa",
                    gradient: { from: "#ffffff", to: "#e4e4e7", angle: 180 },
                    image: { url: "https://example.com/bg.png", size: "cover", position: "center", repeat: false },
                },
            },
        });

        const { html } = await renderEmail(document);
        expect(html).toContain("url(https://example.com/bg.png)");
        expect(html).toMatch(/background-color:\s*#fafafa/i);
        expect(html).toContain("background-size:cover");
        expect(html).toContain("background-repeat:no-repeat");
    });

    it("renders encoded blank lines (&nbsp; paragraphs) as visible empty paragraphs", async () => {
        let document = buildDemoEmail();
        const sectionId = document.blocks[document.rootId].children.main[0];
        const textId = document.blocks[sectionId].children.content[0];
        // The shape RichTextField stores when the user presses Enter twice
        document = updateProps(document, { id: textId, patch: { text: "first\n\n&nbsp;\n\nsecond" } });

        const { html } = await renderEmail(document);
        expect(html).toMatch(/<p[^>]*>\s*&nbsp;\s*<\/p>/);
        expect(html).toContain("first");
        expect(html).toContain("second");
    });

    it("renders markdown paragraphs with an explicit inline margin", async () => {
        const { html } = await renderEmail(buildDemoEmail());
        // p is unstyled by react-email's Markdown defaults: without an inline
        // margin the canvas (preflight: 0) and the preview iframe (browser
        // default) disagree
        expect(html).toMatch(/<p[^>]*margin:0 0 12px/);
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
