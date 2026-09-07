import type { CSSProperties } from "react";
import { cssColor, cssFontFamily, cssLength } from "../../style-props/sanitize.ts";

/*
 * Per-element styles for rendered rich text. Everything is inlined so the
 * output is identical on the canvas (the app's Tailwind preflight zeroes
 * margins and strips bullets), in the preview iframe (browser defaults) and
 * in exported email HTML (client resets).
 *
 * KEEP IN SYNC with the editing-mode CSS in src/style.css
 * (.mat-builder-rich-text-* classes) — the inline editor must be pixel-equal
 * to this render so entering/leaving edit mode never shifts layout.
 */

/** Text-node format bitmask (lexical's TextNode format flags). */
export const TEXT_FORMAT = {
    bold: 1,
    italic: 2,
    strikethrough: 4,
    underline: 8,
    code: 16,
} as const;

/** NodeState key that stores the paragraph line-height multiplier. */
export const LINE_HEIGHT_STATE_KEY = "lineHeight";

/**
 * Headings get a px size with their own tighter line-height (inheriting the
 * body's 1.5 would make 40px headings too airy), explicit weight and margin.
 * Unitless so resized runs inside a heading still scale their line.
 */
export const HEADING_LINE_HEIGHT = 1.2;

export const heading = (fontSize: number): CSSProperties => ({
    fontSize,
    lineHeight: HEADING_LINE_HEIGHT,
    fontWeight: 500,
    margin: "0 0 12px",
});

export const HEADING_SIZES: Record<string, number> = {
    h1: 40,
    h2: 32,
    h3: 28,
    h4: 24,
    h5: 20,
    h6: 16,
};

/* The paragraph margin lives here (not on the block container) so
 * multi-paragraph text spaces itself; the LAST top-level block drops it
 * (render.tsx isLast + the [contenteditable] :last-child rule in style.css) —
 * spacing between blocks is the container gap's job. */
export const PARAGRAPH_STYLES: CSSProperties = { margin: "0 0 12px" };
export const UL_STYLES: CSSProperties = { listStyleType: "disc", paddingLeft: 24, margin: "0 0 12px" };
export const OL_STYLES: CSSProperties = { listStyleType: "decimal", paddingLeft: 24, margin: "0 0 12px" };
export const LI_STYLES: CSSProperties = { margin: "4px 0" };
export const BLOCKQUOTE_STYLES: CSSProperties = {
    margin: "0 0 12px",
    paddingLeft: 16,
    borderLeft: "4px solid #e4e4e7",
    fontStyle: "italic",
};
export const LINK_STYLES: CSSProperties = { color: "#067df7", textDecoration: "underline" };
export const CODE_FONT_FAMILY = "'Courier New', Courier, monospace";

/** Text-node style properties honoured by the renderer. */
/** Each whitelisted property with the guard its value has to pass — a stored
 * `style` string is document data, and the output serializes it straight into
 * `style="…"` (see style-props/sanitize.ts). */
const TEXT_STYLE_WHITELIST: Record<string, [property: keyof CSSProperties, guard: (value: string) => string | undefined]> = {
    "font-family": ["fontFamily", cssFontFamily],
    "font-size": ["fontSize", cssLength],
    "font-weight": ["fontWeight", (value) => (/^(?:[1-9]00|normal|bold|bolder|lighter)$/i.test(value) ? value : undefined)],
    "letter-spacing": ["letterSpacing", cssLength],
    "color": ["color", cssColor],
};

/**
 * Parses a lexical text-node `style` string ($patchStyleText output) into
 * CSSProperties, keeping only whitelisted typography properties — anything
 * else in a stored document is dropped rather than forwarded to email HTML.
 */
export const parseTextStyle = (style: string | undefined): CSSProperties => {
    if (!style) return {};
    const css: Record<string, string> = {};
    for (const declaration of style.split(";")) {
        const colon = declaration.indexOf(":");
        if (colon === -1) continue;
        const property = declaration.slice(0, colon).trim().toLowerCase();
        const value = declaration.slice(colon + 1).trim();
        const entry = TEXT_STYLE_WHITELIST[property];
        const safe = entry && entry[1](value);
        if (entry && safe) css[entry[0]] = safe;
    }
    return css as CSSProperties;
};
