/*
 * Canonical builders for stored rich text (serialized Lexical JSON) —
 * default block content, sample documents and tests build content through
 * these so the stored shape has one source of truth.
 */

import { isRichTextContent } from "./render.tsx";

const textNode = (text: string, style?: string) => ({
    type: "text",
    version: 1,
    detail: 0,
    format: 0,
    mode: "normal",
    style: style ?? "",
    text,
});

const paragraphNode = (text: string, style?: string) => ({
    type: "paragraph",
    version: 1,
    children: text ? [textNode(text, style)] : [],
    direction: null,
    format: "",
    indent: 0,
});

/** A single-paragraph document; `style` is an inline CSS string applied to
 * the text run (e.g. `"font-size: 20px;color: #18181b"`). */
export const richTextParagraph = (text: string, style?: string): string =>
    JSON.stringify({
        root: {
            type: "root",
            version: 1,
            children: [paragraphNode(text, style)],
            direction: null,
            format: "",
            indent: 0,
        },
    });

/** A multi-paragraph document from plain strings (no inline styles). */
export const richTextParagraphs = (...texts: string[]): string =>
    JSON.stringify({
        root: {
            type: "root",
            version: 1,
            children: texts.map((text) => paragraphNode(text)),
            direction: null,
            format: "",
            indent: 0,
        },
    });

/** A single-heading document (h1–h6). */
export const richTextHeading = (text: string, tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" = "h2"): string =>
    JSON.stringify({
        root: {
            type: "root",
            version: 1,
            children: [
                {
                    type: "heading",
                    version: 1,
                    tag,
                    children: [textNode(text)],
                    direction: null,
                    format: "",
                    indent: 0,
                },
            ],
            direction: null,
            format: "",
            indent: 0,
        },
    });

/** Normalizes possibly-plain stored text to rich text — passes documents
 * through untouched and wraps legacy plain strings (e.g. table cells stored
 * before cells became rich text) in a single paragraph. */
export const ensureRichText = (content: string): string =>
    isRichTextContent(content) ? content : richTextParagraph(content);

/** A merge-tag node (docs/06 §merge tags) for composing documents in samples
 * and tests; matches MergeTagNode.exportJSON on the editor side. */
export const richTextMergeTagNode = (token: string, label?: string) => ({
    type: "merge-tag",
    version: 1,
    token,
    ...(label !== undefined ? { label } : {}),
});

export const DEFAULT_TEXT_CONTENT = richTextParagraph("Lorem ipsum dolor sit amet");
