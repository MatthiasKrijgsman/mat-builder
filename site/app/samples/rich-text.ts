/*
 * Rich-text builders for the sample documents. Text blocks store serialized
 * Lexical JSON (docs/06), so a hand-authored sample composes that shape
 * directly — these are the four node kinds the samples need.
 *
 * `style` strings use the text-node syntax the renderer whitelists
 * (font-family, font-size, font-weight, letter-spacing, color).
 */

export const text = (t: string, style = "") => ({
    type: "text",
    version: 1,
    detail: 0,
    format: 0,
    mode: "normal",
    style,
    text: t,
});

export const paragraph = (children: unknown[], align = "") => ({
    type: "paragraph",
    version: 1,
    children,
    direction: null,
    format: align,
    indent: 0,
});

export const heading = (tag: "h1" | "h2" | "h3", children: unknown[], align = "") => ({
    type: "heading",
    version: 1,
    tag,
    children,
    direction: null,
    format: align,
    indent: 0,
});

export const richDoc = (...children: unknown[]) =>
    JSON.stringify({ root: { type: "root", version: 1, children, direction: null, format: "", indent: 0 } });
