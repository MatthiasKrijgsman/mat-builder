import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RichText, richTextToPlain } from "./render.tsx";
import { DEFAULT_TEXT_CONTENT, richTextHeading, richTextParagraph, richTextParagraphs } from "./defaults.ts";

/*
 * The pure serializer: stored Lexical JSON → inline-styled markup. These run
 * under node (no DOM, no lexical) — which is itself the server-safety test
 * for the ./email/render export path.
 */

const doc = (children: unknown[]): string => JSON.stringify({ root: { type: "root", children } });
const p = (children: unknown[], extra: Record<string, unknown> = {}) => ({ type: "paragraph", children, ...extra });
const t = (text: string, extra: Record<string, unknown> = {}) => ({ type: "text", text, format: 0, ...extra });

const render = (content: string): string => renderToStaticMarkup(<RichText content={content} />);

describe("RichText", () => {
    it("renders the default content as a paragraph without a trailing margin", () => {
        const html = render(DEFAULT_TEXT_CONTENT);
        expect(html).toContain("Lorem ipsum dolor sit amet");
        // The single (thus last) top-level block drops its bottom margin —
        // spacing between blocks is the container gap's job.
        expect(html).toMatch(/<p style="margin:0 0 12px;margin-bottom:0">/);
    });

    it("keeps inter-paragraph margins but drops the last one", () => {
        const html = render(richTextParagraphs("first", "second"));
        expect(html).toMatch(/<p style="margin:0 0 12px">first<\/p>/);
        expect(html).toMatch(/<p style="margin:0 0 12px;margin-bottom:0">second<\/p>/);
    });

    it("maps every format bit to inline styles", () => {
        const html = render(
            doc([
                p([
                    t("b", { format: 1 }),
                    t("i", { format: 2 }),
                    t("s", { format: 4 }),
                    t("u", { format: 8 }),
                    t("us", { format: 12 }), // underline + strikethrough combine
                    t("c", { format: 16 }),
                    t("bi", { format: 3 }),
                ]),
            ]),
        );
        expect(html).toMatch(/font-weight:700[^>]*>b</);
        expect(html).toMatch(/font-style:italic[^>]*>i</);
        expect(html).toMatch(/text-decoration:line-through[^>]*>s</);
        expect(html).toMatch(/text-decoration:underline[^>]*>u</);
        expect(html).toMatch(/text-decoration:underline line-through[^>]*>us</);
        expect(html).toMatch(/font-family:(&#x27;|')Courier New/);
        expect(html).toMatch(/font-weight:700;font-style:italic[^>]*>bi</);
    });

    it("renders unformatted text without a span wrapper", () => {
        const html = render(richTextParagraph("bare"));
        expect(html).toContain(">bare<");
        expect(html).not.toContain("<span");
    });

    it("whitelists text-node style properties", () => {
        const html = render(
            doc([p([t("styled", { style: "color: #ff0000; font-size: 20px; position: fixed; background: red" })])]),
        );
        expect(html).toContain("color:#ff0000");
        expect(html).toContain("font-size:20px");
        expect(html).not.toContain("position");
        expect(html).not.toContain("background");
    });

    it("maps element format to text-align, normalising start/end", () => {
        const html = render(
            doc([
                p([t("a")], { format: "center" }),
                p([t("b")], { format: "end" }),
                p([t("c")], { format: "start" }),
                p([t("d")], { format: "" }),
            ]),
        );
        expect(html).toMatch(/text-align:center[^>]*>a|center">a/);
        expect(html).toContain("text-align:right");
        expect(html).toContain("text-align:left");
        // untouched paragraphs get no text-align at all
        expect(html.match(/text-align/g)).toHaveLength(3);
    });

    it("emits NodeState lineHeight as a unitless multiplier (per-run scaling)", () => {
        const html = render(doc([p([t("spaced")], { $: { lineHeight: 1.5 } })]));
        expect(html).toContain("line-height:1.5");
    });

    it("renders headings with px sizes and a unitless line-height", () => {
        const html = render(richTextHeading("Big", "h1"));
        expect(html).toMatch(/<h1 style="font-size:40px;line-height:1.2;font-weight:500;margin:0 0 12px;margin-bottom:0">/);
        const h6 = render(richTextHeading("Small", "h6"));
        expect(h6).toContain("font-size:16px;line-height:1.2");
    });

    it("renders ordered lists with a start offset and nested lists without doubled markers", () => {
        const item = (text: string, children: unknown[] = []) => ({
            type: "listitem",
            children: [t(text), ...children],
        });
        const html = render(
            doc([
                {
                    type: "list",
                    listType: "number",
                    tag: "ol",
                    start: 3,
                    children: [
                        item("one"),
                        {
                            type: "listitem",
                            children: [{ type: "list", listType: "bullet", tag: "ul", children: [item("nested")] }],
                        },
                    ],
                },
            ]),
        );
        expect(html).toMatch(/<ol start="3"/);
        expect(html).toContain("list-style-type:decimal");
        expect(html).toMatch(/<li style="margin:4px 0;list-style-type:none"><ul/);
        expect(html).toContain("nested");
    });

    it("renders links with href/target/rel and the inline link style", () => {
        const html = render(
            doc([p([{ type: "link", url: "https://example.com", target: "_blank", rel: "noopener", children: [t("go")] }])]),
        );
        expect(html).toContain('href="https://example.com"');
        expect(html).toContain('target="_blank"');
        expect(html).toContain('rel="noopener"');
        expect(html).toContain("text-decoration:underline");
    });

    it("keeps empty paragraphs one line tall", () => {
        const html = render(richTextParagraphs("a", "", "b"));
        expect(html).toMatch(/<p style="margin:0 0 12px">\u00A0<\/p>|&nbsp;/);
    });

    it("renders unknown node types' children instead of crashing", () => {
        const html = render(doc([{ type: "widget-of-the-future", children: [p([t("survives")])] }]));
        expect(html).toContain("survives");
    });

    it("renders nothing for malformed content", () => {
        expect(render("not json")).toBe("");
        expect(render("")).toBe("");
        expect(render("42")).toBe("");
        expect(render('{"notRoot": true}')).toBe("");
    });

    it("renders linebreaks as <br>", () => {
        const html = render(doc([p([t("a"), { type: "linebreak" }, t("b")])]));
        expect(html).toContain("a<br/>b");
    });

    it("emits merge-tag tokens as literal text, whatever the delimiter syntax", () => {
        const html = render(
            doc([
                p([t("Hi "), { type: "merge-tag", token: "{{first_name}}", label: "First name" }, t("!")]),
                p([{ type: "merge-tag", token: "*|COMPANY|*", label: "Company" }]),
            ]),
        );
        expect(html).toContain("Hi {{first_name}}!");
        expect(html).toContain("*|COMPANY|*");
        // the display label never reaches the output
        expect(html).not.toContain("First name");
    });

    it("renders merge-tag tokens without a label", () => {
        const html = render(doc([p([{ type: "merge-tag", token: "%email%" }])]));
        expect(html).toContain("%email%");
    });

    it("lets renderMergeTag override merge-tag rendering (canvas chips)", () => {
        const content = doc([p([{ type: "merge-tag", token: "{{first_name}}", label: "First name" }])]);
        const html = renderToStaticMarkup(
            <RichText content={content} renderMergeTag={(node) => <em>{node.label ?? node.token}</em>} />,
        );
        expect(html).toContain("<em>First name</em>");
        expect(html).not.toContain("{{first_name}}");
    });

    it("applies the merge-tag style snapshot to the chip wrapper, not the output", () => {
        const content = doc([
            p([{ type: "merge-tag", token: "{{first_name}}", label: "First name", style: "font-size: 24px" }]),
        ]);
        const chip = renderToStaticMarkup(
            <RichText content={content} renderMergeTag={(node) => <em>{node.label}</em>} />,
        );
        expect(chip).toMatch(/<span style="font-size:24px"><em>First name<\/em><\/span>/);
        // output path: literal token, style ignored
        const output = renderToStaticMarkup(<RichText content={content} />);
        expect(output).toContain("{{first_name}}");
        expect(output).not.toContain("font-size:24px");
    });
});

describe("richTextToPlain", () => {
    it("flattens blocks to single-spaced text", () => {
        expect(richTextToPlain(richTextParagraphs("Hello", "world"))).toBe("Hello world");
    });

    it("keeps link text fused with surrounding words", () => {
        const content = doc([p([t("see "), { type: "link", url: "https://x", children: [t("this")] }, t(" now")])]);
        expect(richTextToPlain(content)).toBe("see this now");
    });

    it("returns empty for malformed content", () => {
        expect(richTextToPlain("nope")).toBe("");
    });

    it("includes merge-tag tokens", () => {
        const content = doc([p([t("Hi "), { type: "merge-tag", token: "{{first_name}}", label: "First name" }])]);
        expect(richTextToPlain(content)).toBe("Hi {{first_name}}");
    });
});
