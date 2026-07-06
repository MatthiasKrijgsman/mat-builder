import type { CSSProperties } from "react";

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
 * Headings get a px size with a matching px line-height (an inherited
 * body line-height would let 40px glyphs overflow), explicit weight and
 * margin — same values the markdown pipeline used before.
 */
export const heading = (fontSize: number): CSSProperties => ({
    fontSize,
    lineHeight: `${Math.round(fontSize * 1.2)}px`,
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
 * multi-paragraph text spaces itself and the last paragraph provides the
 * block's bottom spacing. */
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
const TEXT_STYLE_WHITELIST: Record<string, keyof CSSProperties> = {
    "font-family": "fontFamily",
    "font-size": "fontSize",
    "letter-spacing": "letterSpacing",
    "color": "color",
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
        const key = TEXT_STYLE_WHITELIST[property];
        if (key && value) css[key] = value;
    }
    return css as CSSProperties;
};
