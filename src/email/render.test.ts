import { describe, expect, it } from "vitest";
import { insertBlock, setVisibility, updateProps } from "../core/commands.ts";
import { createDocument, validateDocument } from "../core/document.ts";
import { createRegistry } from "../core/registry.ts";
import type { BuilderDocument } from "../core/types.ts";
import type { BlockVisibility } from "../core/visibility.ts";
import { emailBlocks } from "./index.tsx";
import { applyMso, vmlGradientAngle } from "./mso.ts";
import { emailContainerDefaults, emailContainerSlotStyles, rowChildLayout } from "./blocks/container/styles.ts";
import { buildEmailTree, renderEmail, sanitizeUrlAttributes } from "./render.ts";
import { richTextHeading, richTextMergeTagNode, richTextParagraph } from "./rich-text/index.ts";

const registry = createRegistry(emailBlocks);

/** email-root > container > (text, button) built through the real preset + commands. */
function buildDemoEmail(): BuilderDocument {
    let document = createDocument(registry, "email-root");
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
        document = updateProps(row.document, { id: row.blockId, patch: { direction: "horizontal", columns: "equal" } });
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
        // Two children → equal hybrid columns: 600 − 2×24 padding, halved
        expect(html.match(/display:inline-block;width:100%;max-width:276px/g)).toHaveLength(2);
        expect(html).toContain('<!--[if mso]><td width="276" valign="top"');
        expect(html).toContain('src="https://example.com/pic.png"');
        expect(html).toContain('href="https://example.com/target"');
        expect(html).toContain("border-top:1px solid #e4e4e7"); // divider
        expect(html).toContain("height:24px"); // spacer
    });

    it("emits a fixed image height as both the attribute and the style", async () => {
        let document = buildDemoEmail();
        const containerId = document.blocks[document.rootId].children.main[0];
        const image = insertBlock(
            document,
            { type: "image", at: { parentId: containerId, container: "content", index: 0 } },
            registry,
        );
        document = updateProps(image.document, {
            id: image.blockId,
            patch: {
                src: "https://example.com/pic.png",
                size: { width: "fixed", widthPx: 320, height: "fixed", heightPx: 180 },
            },
        });

        const { html } = await renderEmail(document);
        expect(html).toContain('height="180"'); // Outlook reads the attribute
        expect(html).toContain("height:180px");

        // "hug" height stays out of the attribute and renders as auto
        document = updateProps(document, {
            id: image.blockId,
            patch: { size: { width: "fixed", widthPx: 320, height: "hug", heightPx: 180 } },
        });
        const hug = await renderEmail(document);
        expect(hug.html).not.toContain('height="180"');
        expect(hug.html).toContain("height:auto");
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
        // Children gap = a spacer-row table (Outlook ignores div padding), never flex
        expect(html).toMatch(/<td[^>]*height="12"[^>]*style="height:12px;line-height:12px;font-size:1px;mso-line-height-rule:exactly"/);
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
        // Quoted (sanitize.ts cssUrl); prettier re-quotes the attribute around the raw double quotes
        expect(html).toContain('url("https://example.com/bg.png")');
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
        document = updateProps(nestedRow.document, { id: nestedRow.blockId, patch: { direction: "horizontal", columns: "equal" } });
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
        // The nested row's equal columns: 552 in the outer container, less its own 2×24, halved
        expect(html.match(/max-width:252px/g)).toHaveLength(2);
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

/** buildDemoEmail with a second container carrying `visibility`. */
function buildConditionalEmail(visibility: BlockVisibility): { document: BuilderDocument; conditionalId: string } {
    let document = buildDemoEmail();
    const inserted = insertBlock(
        document,
        { type: "container", at: { parentId: document.rootId, container: "main", index: 1 } },
        registry,
    );
    document = inserted.document;
    const text = insertBlock(
        document,
        { type: "text", at: { parentId: inserted.blockId, container: "content", index: 0 } },
        registry,
    );
    document = updateProps(text.document, { id: text.blockId, patch: { content: richTextParagraph("Pro-only perk") } });
    return {
        document: setVisibility(document, { id: inserted.blockId, visibility }),
        conditionalId: inserted.blockId,
    };
}

const proOnly: BlockVisibility = {
    mode: "rules",
    match: "all",
    rules: [{ token: "{{plan}}", operator: "eq", value: "Pro" }],
};

describe("conditional visibility", () => {
    it("renders every block when no values are supplied", async () => {
        const { document } = buildConditionalEmail(proOnly);
        const { html, text } = await renderEmail(document);
        expect(html).toContain("Pro-only perk");
        expect(text).toContain("Pro-only perk");
    });

    it("omits a block whose rules do not hold for the supplied values", async () => {
        const { document } = buildConditionalEmail(proOnly);

        const matched = await renderEmail(document, { values: { "{{plan}}": "Pro" } });
        expect(matched.html).toContain("Pro-only perk");

        const missed = await renderEmail(document, { values: { "{{plan}}": "Free" } });
        expect(missed.html).not.toContain("Pro-only perk");
        expect(missed.text).not.toContain("Pro-only perk");
        // The rest of the email is untouched
        expect(missed.html).toContain("Hello from mat-builder");
    });

    it("keeps the surviving siblings' column split correct", async () => {
        // Three columns in a horizontal row, one of them conditional: the two
        // that render must split 50/50, not stay at a third each.
        let document = buildDemoEmail();
        const row = insertBlock(document, { type: "container", at: { parentId: document.rootId, container: "main", index: 1 } }, registry);
        document = updateProps(row.document, { id: row.blockId, patch: { direction: "horizontal", columns: "equal" } });
        const ids: string[] = [];
        for (let index = 0; index < 3; index++) {
            const column = insertBlock(
                document,
                { type: "container", at: { parentId: row.blockId, container: "content", index } },
                registry,
            );
            document = column.document;
            ids.push(column.blockId);
        }
        document = setVisibility(document, { id: ids[1], visibility: proOnly });

        const all = await renderEmail(document);
        expect(all.html.match(/max-width:184px/g)).toHaveLength(3);

        const trimmed = await renderEmail(document, { values: { "{{plan}}": "Free" } });
        expect(trimmed.html.match(/max-width:276px/g)).toHaveLength(2);
        expect(trimmed.html).not.toContain("max-width:184px");
    });

    it("returns nothing when the walk starts on a hidden block", () => {
        const { document, conditionalId } = buildConditionalEmail(proOnly);
        const at = { parentId: document.rootId, container: "main", index: 1 };
        expect(buildEmailTree(document, conditionalId, at, { values: { "{{plan}}": "Free" } })).toBeNull();
        expect(buildEmailTree(document, conditionalId, at, { values: { "{{plan}}": "Pro" } })).not.toBeNull();
        // No values at all: the walk renders it, same as the whole-document case
        expect(buildEmailTree(document, conditionalId, at)).not.toBeNull();
    });
});

describe("token substitution", () => {
    /** A text block whose copy is a merge tag, plus a tokenized button href. */
    function buildTokenizedEmail(): BuilderDocument {
        let document = buildDemoEmail();
        const sectionId = document.blocks[document.rootId].children.main[0];
        const textId = document.blocks[sectionId].children.content[0];
        const buttonId = document.blocks[sectionId].children.content[1];
        document = updateProps(document, {
            id: textId,
            patch: {
                content: JSON.stringify({
                    root: {
                        type: "root",
                        children: [
                            {
                                type: "paragraph",
                                children: [
                                    { type: "text", text: "Hi ", format: 0 },
                                    richTextMergeTagNode("{{first_name}}", "First name"),
                                ],
                            },
                        ],
                    },
                }),
            },
        });
        return updateProps(document, { id: buttonId, patch: { href: "https://pay.example/{{invoice_id}}" } });
    }

    it("leaves tokens alone unless asked — the ESP normally substitutes", async () => {
        const { html } = await renderEmail(buildTokenizedEmail(), { values: { "{{first_name}}": "Ada" } });
        expect(html).toContain("{{first_name}}");
        expect(html).not.toContain("Ada");
    });

    it("substitutes in the copy, in hrefs and in the plain-text variant", async () => {
        const { html, text } = await renderEmail(buildTokenizedEmail(), {
            substituteTokens: true,
            values: { "{{first_name}}": "Ada", "{{invoice_id}}": "inv_42" },
        });
        expect(html).toContain("Ada");
        expect(html).not.toContain("{{first_name}}");
        expect(html).toContain('href="https://pay.example/inv_42"');
        expect(text).toContain("Ada");
    });

    it("escapes the value it splices into HTML but not into plain text", async () => {
        const { html, text } = await renderEmail(buildTokenizedEmail(), {
            substituteTokens: true,
            values: { "{{first_name}}": "Ada & <b>Co</b>" },
        });
        expect(html).toContain("Ada &amp; &lt;b&gt;Co&lt;/b&gt;");
        expect(html).not.toContain("<b>Co</b>");
        expect(text).toContain("Ada & <b>Co</b>");
    });

    it("never re-substitutes a value that looks like another token", async () => {
        const { html } = await renderEmail(buildTokenizedEmail(), {
            substituteTokens: true,
            values: { "{{first_name}}": "{{invoice_id}}", "{{invoice_id}}": "inv_42" },
        });
        // The first name renders as the literal text it was given
        expect(html).toContain("{{invoice_id}}");
    });
});

describe("output safety", () => {
    /** A link with `url` inside one paragraph, as lexical stores it. */
    const richTextLink = (url: string, text = "link"): string =>
        JSON.stringify({
            root: {
                type: "root",
                children: [
                    {
                        type: "paragraph",
                        children: [{ type: "link", url, target: "_blank", children: [{ type: "text", text, format: 0 }] }],
                    },
                ],
            },
        });

    function buildLinkedEmail(patches: { button?: Record<string, unknown>; image?: Record<string, unknown>; text?: Record<string, unknown> }) {
        let document = createDocument(registry, "email-root");
        const containerId = document.blocks[document.rootId].children.main[0];
        const at = (index: number) => ({ parentId: containerId, container: "content", index });
        const button = insertBlock(document, { type: "button", at: at(0) }, registry);
        document = updateProps(button.document, { id: button.blockId, patch: { label: "Go", ...patches.button } });
        const image = insertBlock(document, { type: "image", at: at(1) }, registry);
        document = updateProps(image.document, { id: image.blockId, patch: { src: "https://example.com/a.png", ...patches.image } });
        const text = insertBlock(document, { type: "text", at: at(2) }, registry);
        document = updateProps(text.document, { id: text.blockId, patch: patches.text ?? {} });
        return { document, containerId };
    }

    it("drops javascript:/data: URLs from buttons, images and rich-text links", async () => {
        const { document } = buildLinkedEmail({
            button: { href: "javascript:alert(1)" },
            image: { href: "data:text/html,<script>alert(1)</script>" },
            text: { content: richTextLink("JaVaScRiPt:alert(1)") },
        });
        const { html } = await renderEmail(document);
        expect(html).not.toMatch(/javascript:/i);
        expect(html).not.toContain("data:text/html");
        // The image itself survives — only the refused link around it goes
        expect(html).toContain('src="https://example.com/a.png"');
    });

    it("keeps http(s), mailto, tel and token URLs", async () => {
        const { document } = buildLinkedEmail({
            button: { href: "{{unsubscribe_url}}" },
            image: { href: "mailto:hi@example.com" },
            text: { content: richTextLink("https://example.com/x?a=1&b=2") },
        });
        const { html } = await renderEmail(document);
        expect(html).toContain('href="{{unsubscribe_url}}"');
        expect(html).toContain('href="mailto:hi@example.com"');
        expect(html).toContain('href="https://example.com/x?a=1&amp;b=2"');
    });

    it("re-checks URLs after merge-tag substitution", async () => {
        const { document } = buildLinkedEmail({ button: { href: "{{link}}" } });
        const evil = await renderEmail(document, { values: { "{{link}}": "javascript:alert(1)" }, substituteTokens: true });
        expect(evil.html).not.toMatch(/javascript:/i);
        expect(evil.html).toContain('href=""');
        const fine = await renderEmail(document, { values: { "{{link}}": "https://example.com/x?a=1&b=2" }, substituteTokens: true });
        expect(fine.html).toContain('href="https://example.com/x?a=1&amp;b=2"');
    });

    it("refuses an image whose src is not an acceptable URL", async () => {
        const { document } = buildLinkedEmail({ image: { src: "javascript:alert(1)" } });
        const { html } = await renderEmail(document);
        expect(html).not.toContain("<img");
    });

    it("keeps stored colors and fonts from smuggling extra declarations", async () => {
        const { document, containerId } = buildLinkedEmail({
            button: {
                background: { type: "solid", color: "#fff;background-image:url(https://evil/px.gif)" },
                typography: { fontFamily: "Arial; color: red }", fontSize: 14, lineHeight: 1.5, letterSpacing: 0, color: "#000", opacity: 100, align: "left" },
            },
        });
        const withBackground = updateProps(document, {
            id: containerId,
            patch: {
                background: {
                    type: "image",
                    color: "#ffffff",
                    gradient: { from: "#fff", to: "#000", angle: 90 },
                    image: { url: 'https://example.com/bg.png")+url(https://evil/px.gif', size: "cover", position: "center", repeat: false },
                },
            },
        });
        const { html } = await renderEmail(withBackground);
        // The breakout characters are percent-encoded inside one quoted url(); no second url() exists
        expect(html).toContain('url("https://example.com/bg.png%22%29+url%28https://evil/px.gif")');
        expect(html).not.toContain("url(https://evil");
        expect(html).not.toContain("evil/px.gif)");
        expect(html).not.toContain("color: red");
        expect(html).not.toContain("Arial;");
    });

    it("sanitizeUrlAttributes blanks refused values in either quoting style and decodes entities first", () => {
        expect(sanitizeUrlAttributes('<a href="javascript:alert(1)">x</a>')).toBe('<a href="">x</a>');
        expect(sanitizeUrlAttributes("<img src='data:text/html,x' alt='y'>")).toBe("<img src=\"\" alt='y'>");
        expect(sanitizeUrlAttributes('<td background="vbscript:x">')).toBe('<td background="">');
        expect(sanitizeUrlAttributes('<a href="https://example.com/?a=1&amp;b=2">')).toBe('<a href="https://example.com/?a=1&amp;b=2">');
        expect(sanitizeUrlAttributes('<a href="">')).toBe('<a href="">');
        expect(sanitizeUrlAttributes('<p>href="javascript:x" as text</p>')).toBe('<p>href="" as text</p>');
    });
});

describe("renderEmail options for a compile-once host", () => {
    /** The demo email with one block of a type nothing renders. */
    function withUnknownBlock(): BuilderDocument {
        const document = buildDemoEmail();
        const containerId = document.blocks[document.rootId].children.main[0];
        return {
            ...document,
            blocks: {
                ...document.blocks,
                [containerId]: {
                    ...document.blocks[containerId],
                    children: { content: [...document.blocks[containerId].children.content, "widget-1"] },
                },
                "widget-1": { id: "widget-1", type: "widget", props: {}, children: {} },
            },
        };
    }

    it("renders an unknown block type as nothing by default, and throws under `strict`", async () => {
        const document = withUnknownBlock();
        const { html } = await renderEmail(document);
        expect(html).toContain("Hello from mat-builder");

        await expect(renderEmail(document, { strict: true })).rejects.toThrow(
            /no email renderer for block type "widget" \(block "widget-1"\)/,
        );
        // A known type is not what strict is about
        await expect(renderEmail(buildDemoEmail(), { strict: true })).resolves.toBeDefined();
    });

    it("`pretty: false` hands back the render's own single-line HTML", async () => {
        const document = buildDemoEmail();
        const { html: prettified } = await renderEmail(document);
        const { html: raw } = await renderEmail(document, { pretty: false });

        expect(prettified.split("\n").length).toBeGreaterThan(20);
        expect(raw).toContain("<html");
        expect(raw).toContain("Hello from mat-builder");
        // Attributes are neither reflowed nor re-quoted
        expect(raw).toContain('href="https://example.com/buy"');
        expect(raw.split("\n").length).toBeLessThan(5);
    });

    it("`pretty: false` keeps a merge-tag token on one line where the prettifier could wrap it", async () => {
        let document = buildDemoEmail();
        const containerId = document.blocks[document.rootId].children.main[0];
        const textId = document.blocks[containerId].children.content[0];
        const longRun = "A long enough sentence that the prettifier will want to reflow across several lines ";
        const content = JSON.stringify({
            root: {
                type: "root",
                children: [
                    {
                        type: "paragraph",
                        children: [
                            { type: "text", text: longRun.repeat(3), format: 0 },
                            richTextMergeTagNode("{{unsubscribe_url}}", "Unsubscribe"),
                            { type: "text", text: longRun.repeat(3), format: 0 },
                        ],
                    },
                ],
            },
        });
        document = updateProps(document, { id: textId, patch: { content } });
        const { html } = await renderEmail(document, { pretty: false });
        expect(html).toContain("{{unsubscribe_url}}");
        // The prettified output can break the line right there
        const { html: prettified } = await renderEmail(document);
        expect(prettified.replace(/\s+/g, " ")).toContain("{{unsubscribe_url}}");
    });

    it("exposes the document functions a server needs, registry-free", async () => {
        const { validateDocument: validate, loadDocument: load, DOCUMENT_VERSION: version } = await import("./render.ts");
        const document = buildDemoEmail();
        expect(version).toBe(document.version);
        expect(validate(document)).toEqual([]);
        expect(load(document).document).toBe(document);
    });
});

describe("responsive stacking", () => {
    /** The demo email plus a horizontal row of two texts with the given gap. */
    function withRow(gap: number, stackOnMobile?: boolean): BuilderDocument {
        let document = buildDemoEmail();
        const row = insertBlock(document, { type: "container", at: { parentId: document.rootId, container: "main", index: 1 } }, registry);
        document = updateProps(row.document, {
            id: row.blockId,
            patch: { direction: "horizontal", layout: { horizontal: "start", vertical: "start", gap }, ...(stackOnMobile === undefined ? {} : { stackOnMobile }) },
        });
        for (const index of [0, 1]) {
            const text = insertBlock(document, { type: "text", at: { parentId: row.blockId, container: "content", index } }, registry);
            document = updateProps(text.document, { id: text.blockId, patch: { content: richTextParagraph(`Column ${index + 1}`) } });
        }
        return document;
    }

    it("marks every cell of a horizontal container and emits one media query in the head", async () => {
        const { html } = await renderEmail(withRow(12), { pretty: false });
        expect(html).toContain("<style>@media only screen and (max-width: 600px)");
        expect(html).toContain(".mb-stack { display: block !important; width: 100% !important;");
        // The gap survives the stack as bottom padding on every cell but the last
        expect(html).toContain(".mb-stack-gap-12 { padding-bottom: 12px !important; }");
        expect(html).toContain('class="mb-stack mb-stack-gap-12"');
        expect(html).toContain('class="mb-stack"');
        expect(html.indexOf("<style>")).toBeLessThan(html.indexOf("<body"));
    });

    it("emits no gap rule for a gapless row, and no style at all when nothing stacks", async () => {
        const { html: gapless } = await renderEmail(withRow(0), { pretty: false });
        expect(gapless).toContain("<style>@media");
        expect(gapless).not.toContain("mb-stack-gap");

        const { html: optedOut } = await renderEmail(withRow(12, false), { pretty: false });
        expect(optedOut).not.toContain("<style>");
        expect(optedOut).not.toContain("mb-stack");

        const { html: vertical } = await renderEmail(buildDemoEmail(), { pretty: false });
        expect(vertical).not.toContain("<style>");
    });

    it("stacks by default on documents written before the option existed", async () => {
        const document = withRow(8);
        const rowId = document.blocks[document.rootId].children.main[1];
        const { stackOnMobile: _dropped, ...legacyProps } = document.blocks[rowId].props;
        void _dropped;
        const legacy: BuilderDocument = { ...document, blocks: { ...document.blocks, [rowId]: { ...document.blocks[rowId], props: legacyProps } } };
        const { html } = await renderEmail(legacy, { pretty: false });
        expect(html).toContain('class="mb-stack mb-stack-gap-8"');
    });
});

describe("conditional emission adapter", () => {
    const liquid = {
        wrap: (html: string, rule: BlockVisibility, block: { id: string; type: string }) =>
            `{% if ${rule.rules.map((r) => `${r.token} ${r.operator} ${r.value ?? ""}`).join(rule.match === "all" ? " and " : " or ")} %}<!--${block.type}-->${html}{% endif %}`,
    };
    const proRule: BlockVisibility = { mode: "rules", match: "all", rules: [{ token: "{{plan}}", operator: "eq", value: "pro" }] };

    /** The demo email with its button shown only to "pro" recipients. */
    function withConditionalButton(): BuilderDocument {
        const document = buildDemoEmail();
        const containerId = document.blocks[document.rootId].children.main[0];
        const buttonId = document.blocks[containerId].children.content[1];
        return setVisibility(document, { id: buttonId, visibility: proRule });
    }

    it("wraps a conditional block's whole element in the host's syntax, marker removed", async () => {
        for (const pretty of [false, true]) {
            const { html } = await renderEmail(withConditionalButton(), { conditionals: liquid, pretty });
            const open = html.indexOf("{% if {{plan}} eq pro %}<!--button-->");
            const close = html.indexOf("{% endif %}");
            expect(open).toBeGreaterThan(-1);
            expect(close).toBeGreaterThan(open);
            const inside = html.slice(open, close);
            // The block's complete markup, outer table included, and only that
            expect(inside).toContain("Buy now");
            expect(inside.match(/<table/g)?.length).toBe(inside.match(/<\/table>/g)?.length);
            expect(inside).not.toContain("Hello from mat-builder");
            expect(html).not.toContain("data-mb-cond");
        }
    });

    it("renders everything — `values` no longer hides — and leaves the plain text untouched", async () => {
        const { html, text } = await renderEmail(withConditionalButton(), { conditionals: liquid, values: { "{{plan}}": "free" } });
        expect(html).toContain("Buy now");
        expect(text).toContain("Buy now");
        expect(text).not.toContain("{% if");
        // Without the adapter the same values drop the block
        const resolved = await renderEmail(withConditionalButton(), { values: { "{{plan}}": "free" } });
        expect(resolved.html).not.toContain("Buy now");
    });

    it("nests: a conditional block inside a conditional container wraps inside its parent's wrapper", async () => {
        let document = withConditionalButton();
        const containerId = document.blocks[document.rootId].children.main[0];
        const outer: BlockVisibility = { mode: "rules", match: "any", rules: [{ token: "{{country}}", operator: "exists" }] };
        document = setVisibility(document, { id: containerId, visibility: outer });
        const { html } = await renderEmail(document, { conditionals: liquid, pretty: false });
        const outerOpen = html.indexOf("{% if {{country}} exists  %}<!--container-->");
        const innerOpen = html.indexOf("{% if {{plan}} eq pro %}<!--button-->");
        const innerClose = html.indexOf("{% endif %}", innerOpen);
        const outerClose = html.lastIndexOf("{% endif %}");
        expect(outerOpen).toBeGreaterThan(-1);
        expect(innerOpen).toBeGreaterThan(outerOpen);
        expect(outerClose).toBeGreaterThan(innerClose);
        expect(html).not.toContain("data-mb-cond");
    });

    it("works alongside token substitution, and on a void element", async () => {
        let document = withConditionalButton();
        const containerId = document.blocks[document.rootId].children.main[0];
        const image = insertBlock(document, { type: "image", at: { parentId: containerId, container: "content", index: 2 } }, registry);
        document = updateProps(image.document, { id: image.blockId, patch: { src: "https://example.com/{{plan}}.png", alt: "Plan" } });
        document = setVisibility(document, { id: image.blockId, visibility: proRule });
        const { html } = await renderEmail(document, {
            conditionals: liquid,
            values: { "{{plan}}": "pro" },
            substituteTokens: true,
            pretty: false,
        });
        // The wrapper's own syntax is never substituted; the block's content is
        expect(html).toContain("{% if {{plan}} eq pro %}<!--image--><img");
        expect(html).toContain('src="https://example.com/pro.png"');
        expect(html).not.toContain("data-mb-cond");
    });
});

describe("Outlook on Windows (docs/06)", () => {
    /** Root > seeded container (24px padding) > horizontal row (gap 16, no padding) > two images. */
    function buildImageColumns(imageSize: Record<string, unknown>) {
        let document = createDocument(registry, "email-root");
        const containerId = document.blocks[document.rootId].children.main[0];
        const row = insertBlock(document, { type: "container", at: { parentId: containerId, container: "content", index: 0 } }, registry);
        document = updateProps(row.document, {
            id: row.blockId,
            patch: {
                direction: "horizontal",
                columns: "equal",
                spacing: { padding: { top: 0, right: 0, bottom: 0, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 } },
                layout: { horizontal: "start", vertical: "start", gap: 16 },
            },
        });
        for (const index of [0, 1]) {
            const image = insertBlock(document, { type: "image", at: { parentId: row.blockId, container: "content", index } }, registry);
            document = updateProps(image.document, {
                id: image.blockId,
                patch: { src: `https://example.com/${index}.png`, size: { width: "full", widthPx: 552, height: "hug", heightPx: 100, ...imageSize } },
            });
        }
        return document;
    }

    it("wraps the content column in an Outlook-only fixed-width table and pins 96 DPI", async () => {
        const { html } = await renderEmail(buildDemoEmail());
        expect(html).toContain('<!--[if mso]><table role="presentation" width="600" align="center"');
        expect(html).toContain("<!--[if mso]></td></tr></table><![endif]-->");
        expect(html).toContain("<o:PixelsPerInch>96</o:PixelsPerInch>");
        expect(html).toMatch(/<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"/);
        // The marker attribute never reaches the output
        expect(html).not.toContain("data-mb-mso-width");
    });

    it("gives every sized image a px width attribute from its column", async () => {
        // 600 − 2×24 container padding = 552, split in two less half the 16px gap
        const { html } = await renderEmail(buildImageColumns({}));
        expect(html.match(/<img[^>]*width="268"/g)).toHaveLength(2);
    });

    it("caps a fixed image width at its column and aligns it with a cell attribute", async () => {
        const { html } = await renderEmail(buildImageColumns({ width: "fixed", widthPx: 500 }));
        expect(html.match(/<img[^>]*width="268"/g)).toHaveLength(2);

        const narrow = await renderEmail(buildImageColumns({ width: "fixed", widthPx: 120 }));
        expect(narrow.html.match(/<img[^>]*width="120"/g)).toHaveLength(2);
        expect(narrow.html).toMatch(/<td align="center">\s*<img/);
    });

    it("leaves no marker behind, even where the prettifier split the tag", async () => {
        const { html } = await renderEmail(buildImageColumns({}));
        expect(html).not.toMatch(/data-mb-(not-)?mso/);
        expect(applyMso('<div><span data-mb-mso="%3Cb%3E"></span\n   ></div>')).toBe("<div><!--[if mso]><b><![endif]--></div>");
    });

    it("gives stacking columns an Outlook ghost table of fixed cells", async () => {
        const { html } = await renderEmail(buildImageColumns({}));
        expect(html).toContain('<!--[if mso]><table role="presentation" width="552" align="left" border="0" cellpadding="0" cellspacing="0"><tr><![endif]-->');
        expect(html.match(/<!--\[if mso\]><td width="276" valign="top"/g)).toHaveLength(2);
        expect(html).toContain("<!--[if mso]></tr></table><![endif]-->");
    });

    it("ships a VML roundrect for a rounded button and hides the anchor from Outlook", async () => {
        const { html } = await renderEmail(buildDemoEmail());
        // The preset button is rounded (6px) — Outlook gets the shape, everyone else the anchor
        expect(html).toMatch(/<!--\[if mso\]><v:roundrect [^>]*href="https:\/\/example.com\/buy"[^>]*arcsize="\d+%"/);
        expect(html).toMatch(/<v:roundrect[\s\S]*>Buy now<\/center><\/v:roundrect><!\[endif\]-->/);
        expect(html).toMatch(/<!--\[if !mso\]><!-->\s*<a\s+href="https:\/\/example.com\/buy"/);
    });

    it("paints gradient container backgrounds with VML, padding moved into the inset", async () => {
        let document = buildDemoEmail();
        const containerId = document.blocks[document.rootId].children.main[0];
        document = updateProps(document, {
            id: containerId,
            patch: { background: { type: "gradient", color: "#ffffff", gradient: { from: "#111111", to: "#222222", angle: 180 } } },
        });
        const { html } = await renderEmail(document);
        expect(html).toContain('<v:fill type="gradient" color="#111111" color2="#222222" angle="90" />');
        expect(html).toContain('<v:textbox inset="24px,24px,24px,24px" style="mso-fit-shape-to-text:true">');
        expect(html).toContain("mso-padding-alt:0px");
        expect(vmlGradientAngle(90)).toBe(0);
        expect(vmlGradientAngle(0)).toBe(270);
    });

});

describe("auto rows (docs/06 §Rows)", () => {
    /** Root > seeded container (24px padding → 552 inner) > auto row (no padding) > the given children. */
    function buildAutoRow(layout: Record<string, unknown>, children: { type: string; props: Record<string, unknown> }[], rowProps: Record<string, unknown> = {}) {
        let document = createDocument(registry, "email-root");
        const containerId = document.blocks[document.rootId].children.main[0];
        const row = insertBlock(document, { type: "container", at: { parentId: containerId, container: "content", index: 0 } }, registry);
        document = updateProps(row.document, {
            id: row.blockId,
            patch: {
                direction: "horizontal",
                spacing: { padding: { top: 0, right: 0, bottom: 0, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 } },
                layout: { horizontal: "start", vertical: "start", gap: 0, ...layout },
                ...rowProps,
            },
        });
        children.forEach((child, index) => {
            const inserted = insertBlock(document, { type: child.type, at: { parentId: row.blockId, container: "content", index } }, registry);
            document = updateProps(inserted.document, { id: inserted.blockId, patch: child.props });
        });
        return { document, rowId: row.blockId };
    }

    it("creates new containers as auto rows and reads stored ones without the prop as equal", () => {
        const { document, rowId } = buildAutoRow({}, []);
        expect(document.blocks[rowId].props.columns).toBe("auto");
        expect(emailBlocks.find((block) => block.type === "container")?.defaultProps).not.toHaveProperty("columns");
    });

    it("centres a group of Hug children with the row's horizontal alignment", async () => {
        const { document } = buildAutoRow({ horizontal: "center", gap: 12 }, [
            { type: "button", props: { label: "One" } },
            { type: "button", props: { label: "Two" } },
        ]);
        const { html } = await renderEmail(document);
        expect(html).toMatch(/<div style="font-size:0;text-align:center">/);
        // Hug columns shrink to their content: no width, and no stacking class
        expect(html).toMatch(/<div\s+style="display:inline-block;vertical-align:top;padding-left:0;padding-right:6px/);
        expect(html).not.toContain('class="mb-stack');
        // Outlook: a ghost table without a width, placed by align
        expect(html).toContain('<!--[if mso]><table role="presentation" align="center" border="0"');
    });

    it("gives Fixed columns their width and Fill columns what is left", async () => {
        const { document } = buildAutoRow({ gap: 20 }, [
            { type: "container", props: { size: { width: "fixed", widthPx: 200, height: "hug", heightPx: 100 } } },
            { type: "container", props: { size: { width: "full", widthPx: 300, height: "hug", heightPx: 100 } } },
        ]);
        const { html } = await renderEmail(document);
        // 552 − 20 gap − 200 = 332 for the Fill; each column carries its half-gap
        expect(html).toContain("display:inline-block;width:210px;max-width:100%");
        expect(html).toContain("display:inline-block;width:342px;max-width:100%");
        expect(html).toContain('<!--[if mso]><td width="210"');
        expect(html).toContain('<!--[if mso]><td width="342"');
    });

    it("sizes a Percent column from the row and fills it with the block", async () => {
        const { document } = buildAutoRow({ horizontal: "center" }, [
            { type: "image", props: { src: "https://example.com/a.png", size: { width: "percent", widthPct: 25, widthPx: 100, height: "hug", heightPx: 100 } } },
        ]);
        const { html } = await renderEmail(document);
        // 25% of 552 = 138 for the column; the image fills it rather than taking 25% again
        expect(html).toContain("display:inline-block;width:138px;max-width:100%");
        const img = /<img[^>]*>/.exec(html)?.[0] ?? "";
        expect(img).toContain('width="138"');
        expect(img).toMatch(/style="[^"]*;width:100%/);
    });

    it("keeps an auto row that does not stack as a table row placed by align", async () => {
        const { document } = buildAutoRow({ horizontal: "end" }, [{ type: "button", props: { label: "Go" } }], { stackOnMobile: false });
        const { html } = await renderEmail(document);
        expect(html).toMatch(/<table\s+role="presentation"\s+align="right"/);
    });

    it("lays children out on the canvas the way the output sizes them", () => {
        const row = { ...emailContainerDefaults, direction: "horizontal" as const, columns: "auto" as const };
        const size = (width: string) => ({ size: { width, widthPx: 120, widthPct: 30, height: "hug", heightPx: 10 } });
        expect(rowChildLayout(row, size("full"))?.style).toEqual({ flex: "1 1 0%", minWidth: 0 });
        expect(rowChildLayout(row, size("hug"))?.style).toEqual({ flex: "0 1 auto", minWidth: 0 });
        expect(rowChildLayout(row, {})?.style).toEqual({ flex: "1 1 0%", minWidth: 0 }); // no size prop = Fill
        const percent = rowChildLayout(row, size("percent"));
        expect(percent?.style).toEqual({ flex: "0 1 30%", minWidth: 0 });
        expect((percent?.props?.size as { width: string }).width).toBe("full");
        // Equal rows (and rows stored before the option) leave the slot's equal split alone
        expect(rowChildLayout({ ...row, columns: "equal" }, size("hug"))).toBeUndefined();
        expect(rowChildLayout({ ...row, columns: undefined }, size("hug"))).toBeUndefined();
        expect(emailContainerSlotStyles({ ...row, layout: { ...row.layout, horizontal: "center" } })?.justifyContent).toBe("center");
    });
});
