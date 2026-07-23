import { describe, expect, it } from "vitest";
import { insertBlock, updateProps } from "../core/commands.ts";
import { createDocument, validateDocument } from "../core/document.ts";
import { createRegistry } from "../core/registry.ts";
import type { BuilderDocument } from "../core/types.ts";
import { emailBlocks } from "./index.tsx";
import { buildEmailTree, renderEmail } from "./render.ts";
import { uniformSides } from "../style-props/index.ts";
import { richTextHeading, richTextMergeTagNode, richTextParagraph } from "./rich-text/index.ts";

const registry = createRegistry(emailBlocks);

/** email-root > container > (text, button) built through the real preset + commands. */
function buildDemoEmail(): BuilderDocument {
    let document = createDocument(registry, "email-root", { previewText: "Preview snippet" });
    // The root's onCreate seeds one container — build inside it
    const containerId = document.blocks[document.rootId].children.main[0];

    const text = insertBlock(
        document,
        { type: "text", at: { parentId: containerId, container: "content", index: 0 } },
        registry,
    );
    document = updateProps(text.document, { id: text.blockId, patch: { content: richTextParagraph("Hello from mat-builder") } });
    const button = insertBlock(
        document,
        { type: "button", at: { parentId: containerId, container: "content", index: 1 } },
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

    it("seeds new documents with one white container", () => {
        const document = createDocument(registry, "email-root");
        const main = document.blocks[document.rootId].children.main;
        expect(main).toHaveLength(1);
        const seeded = document.blocks[main[0]];
        expect(seeded.type).toBe("container");
        expect(seeded.props.background).toMatchObject({ type: "solid", color: "#FFFFFF" });
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

    it("renders horizontal containers as equal-width columns, plus image, divider and spacer", async () => {
        let document = buildDemoEmail();
        const root = document.rootId;

        const row = insertBlock(document, { type: "container", at: { parentId: root, container: "main", index: 1 } }, registry);
        document = updateProps(row.document, { id: row.blockId, patch: { direction: "horizontal" } });
        const headingText = insertBlock(
            document,
            { type: "text", at: { parentId: row.blockId, container: "content", index: 0 } },
            registry,
        );
        document = updateProps(headingText.document, {
            id: headingText.blockId,
            patch: { content: richTextHeading("Column heading", "h2") },
        });
        const image = insertBlock(
            document,
            { type: "image", at: { parentId: row.blockId, container: "content", index: 1 } },
            registry,
        );
        document = updateProps(image.document, {
            id: image.blockId,
            patch: { src: "https://example.com/pic.png", alt: "A picture", href: "https://example.com/target" },
        });
        const containerId = document.blocks[root].children.main[0];
        document = insertBlock(document, { type: "divider", at: { parentId: containerId, container: "content", index: 0 } }, registry).document;
        document = insertBlock(document, { type: "spacer", at: { parentId: containerId, container: "content", index: 0 } }, registry).document;

        expect(validateDocument(document, registry)).toEqual([]);
        const { html } = await renderEmail(document);

        expect(html).toContain("Column heading");
        expect(html).toMatch(/<h2[^>]*>[\s\S]*Column heading/);
        expect(html).toContain("width:50.00%"); // two children → equal split
        expect(html).toContain('src="https://example.com/pic.png"');
        expect(html).toContain('href="https://example.com/target"');
        expect(html).toContain("border-top:1px solid #e4e4e7"); // divider
        expect(html).toContain("height:24px"); // spacer
    });

    it("renders a fixed height and vertical alignment into the email output", async () => {
        let document = buildDemoEmail();
        const containerId = document.blocks[document.rootId].children.main[0];
        const size = document.blocks[containerId].props.size as Record<string, unknown>;
        document = updateProps(document, {
            id: containerId,
            patch: {
                size: { ...size, height: "fixed", heightPx: 240 },
                layout: { horizontal: "start", vertical: "middle", gap: 0 },
            },
        });

        const { html } = await renderEmail(document);
        // Height + vertical-align land on a td so email clients honor them
        expect(html).toMatch(/<td[^>]*height:240px[^>]*vertical-align:middle|<td[^>]*vertical-align:middle[^>]*height:240px/);
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

    it("renders rich text formatting (bold, links) into the output", async () => {
        let document = buildDemoEmail();
        const sectionId = document.blocks[document.rootId].children.main[0];
        const textId = document.blocks[sectionId].children.content[0];
        const content = JSON.stringify({
            root: {
                type: "root",
                children: [
                    {
                        type: "paragraph",
                        children: [
                            { type: "text", text: "Plain, ", format: 0 },
                            { type: "text", text: "bold", format: 1 },
                            { type: "text", text: " and a ", format: 0 },
                            {
                                type: "link",
                                url: "https://example.com/rt",
                                children: [{ type: "text", text: "link", format: 0 }],
                            },
                            { type: "text", text: ".", format: 0 },
                        ],
                    },
                ],
            },
        });
        document = updateProps(document, { id: textId, patch: { content } });

        const { html, text } = await renderEmail(document);
        expect(html).toMatch(/<span[^>]*font-weight:700[^>]*>bold<\/span>/);
        expect(html).toContain('href="https://example.com/rt"');
        expect(text).toContain("bold");
    });

    it("renders per-selection typography (color, size, font) from text-node styles", async () => {
        let document = buildDemoEmail();
        const sectionId = document.blocks[document.rootId].children.main[0];
        const textId = document.blocks[sectionId].children.content[0];
        const content = JSON.stringify({
            root: {
                type: "root",
                children: [
                    {
                        type: "paragraph",
                        $: { lineHeight: 1.8 },
                        format: "center",
                        children: [
                            { type: "text", text: "normal ", format: 0 },
                            {
                                type: "text",
                                text: "loud",
                                format: 0,
                                style: "color: rgba(255, 0, 0, 0.5);font-size: 24px;font-family: Georgia, 'Times New Roman', serif",
                            },
                        ],
                    },
                ],
            },
        });
        document = updateProps(document, { id: textId, patch: { content } });

        const { html } = await renderEmail(document);
        // (pretty-printed output wraps attributes, so match substrings)
        expect(html).toContain("color:rgba(255, 0, 0, 0.5)");
        expect(html).toContain("font-size:24px");
        expect(html).toContain("font-family:Georgia");
        expect(html).toMatch(/>loud<\/span/);
        expect(html).toContain("margin:0 0 12px;margin-bottom:0;text-align:center;line-height:1.8");
    });

    it("renders rich text lists with explicit inline list styles", async () => {
        let document = buildDemoEmail();
        const sectionId = document.blocks[document.rootId].children.main[0];
        const textId = document.blocks[sectionId].children.content[0];
        const item = (text: string) => ({
            type: "listitem",
            children: [{ type: "text", text, format: 0 }],
        });
        const content = JSON.stringify({
            root: {
                type: "root",
                children: [{ type: "list", listType: "bullet", tag: "ul", children: [item("D"), item("E"), item("F")] }],
            },
        });
        document = updateProps(document, { id: textId, patch: { content } });

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

    it("renders empty paragraphs as visible blank lines (&nbsp;)", async () => {
        let document = buildDemoEmail();
        const sectionId = document.blocks[document.rootId].children.main[0];
        const textId = document.blocks[sectionId].children.content[0];
        // The shape Lexical stores when the user presses Enter twice
        const content = JSON.stringify({
            root: {
                type: "root",
                children: [
                    { type: "paragraph", children: [{ type: "text", text: "first", format: 0 }] },
                    { type: "paragraph", children: [] },
                    { type: "paragraph", children: [{ type: "text", text: "second", format: 0 }] },
                ],
            },
        });
        document = updateProps(document, { id: textId, patch: { content } });

        const { html } = await renderEmail(document);
        expect(html).toMatch(/<p[^>]*>\s*(&nbsp;|\u00A0)\s*<\/p>/);
        expect(html).toContain("first");
        expect(html).toContain("second");
    });

    it("renders the table block as a native <table> with header styling", async () => {
        let document = buildDemoEmail();
        const section = document.blocks[document.rootId].children.main[0];
        const table = insertBlock(
            document,
            { type: "table", at: { parentId: section, container: "content", index: 2 } },
            registry,
        );
        document = updateProps(table.document, {
            id: table.blockId,
            patch: {
                cells: [
                    ["Plan", "Price"],
                    ["Pro", "$12"],
                ],
                headerRow: true,
                border: { width: uniformSides(1), style: "solid", color: "#e4e4e7", radius: 8 },
            },
        });
        const { html } = await renderEmail(document);
        // separate borders (collapse would disable border-radius)
        expect(html).toContain("border-collapse:separate");
        // Cells are rich text; plain strings (legacy documents) are wrapped
        // into a paragraph on read — header cell: bold + background.
        expect(html).toMatch(/<td[^>]*font-weight:600[^>]*>\s*<p[^>]*>[^<]*Plan/);
        expect(html).toMatch(/<td[^>]*>\s*<p[^>]*>[^<]*\$12/);
        // 1px default cell borders: every cell right+bottom, first row adds top
        expect(html).toMatch(/<td[^>]*border-right:1px solid[^>]*border-bottom:1px solid[^>]*border-top:1px solid/);
        // radius rounds the frame and the corner cells
        expect(html).toMatch(/<table[^>]*border-radius:8px/);
        expect(html).toMatch(/<td[^>]*border-top-left-radius:8px/);
    });

    it("renders paragraphs with an explicit inline margin", async () => {
        const { html } = await renderEmail(buildDemoEmail());
        // Without an inline margin the canvas (preflight: 0) and the preview
        // iframe (browser default) disagree
        expect(html).toMatch(/<p[^>]*margin:0 0 12px/);
    });

    it("renders nested containers, including a horizontal row inside a vertical container", async () => {
        let document = buildDemoEmail();
        const outer = document.blocks[document.rootId].children.main[0];

        const inner = insertBlock(
            document,
            { type: "container", at: { parentId: outer, container: "content", index: 0 } },
            registry,
        );
        document = inner.document;
        const innerText = insertBlock(
            document,
            { type: "text", at: { parentId: inner.blockId, container: "content", index: 0 } },
            registry,
        );
        document = updateProps(innerText.document, {
            id: innerText.blockId,
            patch: { content: richTextParagraph("Nested container copy") },
        });
        const nestedRow = insertBlock(
            document,
            { type: "container", at: { parentId: outer, container: "content", index: 1 } },
            registry,
        );
        document = updateProps(nestedRow.document, { id: nestedRow.blockId, patch: { direction: "horizontal" } });
        for (const index of [0, 1]) {
            document = insertBlock(
                document,
                { type: "spacer", at: { parentId: nestedRow.blockId, container: "content", index } },
                registry,
            ).document;
        }

        expect(validateDocument(document, registry)).toEqual([]);
        const { html } = await renderEmail(document);
        expect(html).toContain("Nested container copy");
        expect(html).toContain("width:50.00%"); // the nested row's equal-split cells
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

    it("emits merge-tag tokens literally in text content, button href and both output variants", async () => {
        let document = buildDemoEmail();
        const sectionId = document.blocks[document.rootId].children.main[0];
        const textId = document.blocks[sectionId].children.content[0];
        const buttonId = document.blocks[sectionId].children.content[1];
        const content = JSON.stringify({
            root: {
                type: "root",
                children: [
                    {
                        type: "paragraph",
                        children: [
                            { type: "text", text: "Hi ", format: 0 },
                            richTextMergeTagNode("{{first_name}}", "First name"),
                            { type: "text", text: ", welcome to ", format: 0 },
                            richTextMergeTagNode("*|COMPANY|*", "Company"),
                        ],
                    },
                ],
            },
        });
        document = updateProps(document, { id: textId, patch: { content } });
        document = updateProps(document, {
            id: buttonId,
            patch: { label: "Open {{first_name}}'s invoice", href: "{{invoice_url}}" },
        });

        const { html, text } = await renderEmail(document);
        // (React's streamed render separates adjacent text nodes with <!-- -->,
        // so tokens are asserted individually rather than as one fused string)
        expect(html).toContain("{{first_name}}");
        expect(html).toContain("*|COMPANY|*");
        expect(html).toContain('href="{{invoice_url}}"');
        expect(html).toContain("Open {{first_name}}");
        // display labels never reach the output
        expect(html).not.toContain("First name");
        expect(text).toContain("Hi {{first_name}}, welcome to *|COMPANY|*");
    });
});
