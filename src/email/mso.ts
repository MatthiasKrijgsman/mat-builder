import { cloneElement, createElement, type ReactElement } from "react";

/*
 * Outlook-only markup (docs/06 §Outlook on Windows). Server-safe module.
 *
 * Classic Outlook for Windows renders with Word, and the fixes every email
 * framework ships for it — ghost tables, VML shapes — live inside
 * conditional comments (`<!--[if mso]>…<![endif]-->`) that only Outlook
 * reads. React cannot emit comments, so renderers emit MARKERS instead and
 * `applyMso` turns them into comments after rendering:
 *
 * - `msoOnly(html)` — an empty span carrying the markup, encoded, in an
 *   attribute; becomes `<!--[if mso]>html<![endif]-->`. Place it where a
 *   span may stand (inside a td or div, never directly in a tr: the
 *   prettifier's HTML parser would foster-parent it out).
 * - `hideFromMso(element)` — marks an element that Outlook must NOT see
 *   because an `msoOnly` sibling replaces it; becomes
 *   `<!--[if !mso]><!-->element<!--<![endif]-->`.
 *
 * The pass runs before merge-tag substitution and URL sanitizing, so tokens
 * and hrefs inside the Outlook markup are handled like any others. Markup
 * handed to `msoOnly` is raw HTML: escape every value that goes into it.
 */

export const MSO_ATTRIBUTE = "data-mb-mso";
export const NOT_MSO_ATTRIBUTE = "data-mb-not-mso";

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;" };
/** Escapes text or an attribute value for markup built by hand. */
export const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

// encodeURIComponent leaves `'` alone, which React would entity-escape
const encode = (html: string): string => encodeURIComponent(html).replace(/'/g, "%27");

export function msoOnly(html: string, key?: string | number): ReactElement {
    return createElement("span", { key, [MSO_ATTRIBUTE]: encode(html) });
}

export function hideFromMso(element: ReactElement): ReactElement {
    return cloneElement(element as ReactElement<Record<string, unknown>>, { [NOT_MSO_ATTRIBUTE]: "" });
}

export const VOID_ELEMENTS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);

/** Where the element whose open tag ends at `openEnd` closes — counting
 * nested same-name tags — or -1 when it never does. */
export function elementEnd(html: string, tag: string, openEnd: number): number {
    if (VOID_ELEMENTS.has(tag)) return openEnd;
    const tags = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
    tags.lastIndex = openEnd;
    let depth = 1;
    let found: RegExpExecArray | null;
    while ((found = tags.exec(html))) {
        depth += found[1] ? -1 : 1;
        if (depth === 0) return found.index + found[0].length;
    }
    return -1;
}

/*
 * The head's Office settings pin Outlook to 96 DPI: without them, a Windows
 * machine at 120 DPI scales attribute widths and CSS widths differently and
 * the layout comes apart. The namespaces let Outlook read the VML shapes.
 */
const MSO_NAMESPACES = ' xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"';
const MSO_HEAD =
    "<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch>" +
    "</o:OfficeDocumentSettings></xml></noscript><![endif]-->";

// The prettifier breaks long tags as `</span\n  >`, hence the whitespace allowances
const MSO_SPAN = new RegExp(`<span\\s+${MSO_ATTRIBUTE}="([^"]*)"\\s*>\\s*</span\\s*>`, "g");
const NOT_MSO = new RegExp(`\\s${NOT_MSO_ATTRIBUTE}(?:="")?(?=[\\s>/])`);

/** Turns the markers into conditional comments and adds the Office head settings. */
export function applyMso(html: string): string {
    let out = html
        .replace(/<html\b/i, (open) => open + MSO_NAMESPACES)
        .replace(/<head\b[^>]*>/i, (open) => open + MSO_HEAD)
        .replace(MSO_SPAN, (_match, encoded: string) => `<!--[if mso]>${decodeURIComponent(encoded)}<![endif]-->`);

    for (let guard = 0; guard < 10_000; guard++) {
        const match = NOT_MSO.exec(out);
        if (!match) return out;
        const start = out.lastIndexOf("<", match.index);
        const tag = /^<([a-zA-Z][\w-]*)/.exec(out.slice(start))?.[1]?.toLowerCase() ?? "";
        const openEnd = out.indexOf(">", match.index + match[0].length) + 1;
        const end = elementEnd(out, tag, openEnd);
        const element = out.slice(start, end < 0 ? openEnd : end).replace(match[0], "");
        out = out.slice(0, start) + `<!--[if !mso]><!-->${element}<!--<![endif]-->` + out.slice(end < 0 ? openEnd : end);
    }
    throw new Error("applyMso: too many markers");
}

/* ── VML vocabulary ───────────────────────────────────────────────────── */

/** A colour VML accepts (hex or a keyword), or "" — VML has no rgba(). */
export function vmlColor(value: unknown): string {
    if (typeof value !== "string") return "";
    const color = value.trim();
    return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(color) || /^[a-z]+$/i.test(color) ? color : "";
}

/**
 * CSS `linear-gradient(<angle>deg, from, to)` → the `angle` of a VML
 * gradient fill with `color` = from and `color2` = to. Outlook's VML reads
 * 0 as left-to-right and turns clockwise, a quarter turn from CSS's
 * "0deg = to top": CSS 180deg (top to bottom) is VML 90. From the
 * convention Maizzle ships; the Microsoft VML reference documents a
 * different default, which Outlook does not follow.
 */
export const vmlGradientAngle = (cssAngle: number): number => (((cssAngle - 90) % 360) + 360) % 360;

/** The `<v:fill>` for a background, or "" when VML cannot draw it (solid fills go on the shape's fillcolor). */
export function vmlFill(background: { type?: string; gradient?: { from?: string; to?: string; angle?: number }; image?: { url?: string; size?: string }; color?: string } | undefined, imageUrl?: string): string {
    if (background?.type === "gradient") {
        const from = vmlColor(background.gradient?.from);
        const to = vmlColor(background.gradient?.to);
        if (!from || !to) return "";
        const angle = vmlGradientAngle(typeof background.gradient?.angle === "number" ? background.gradient.angle : 180);
        return `<v:fill type="gradient" color="${escapeHtml(from)}" color2="${escapeHtml(to)}" angle="${angle}" />`;
    }
    if (background?.type === "image" && imageUrl) {
        const color = vmlColor(background.color);
        // "frame" stretches to the shape, the closest VML has to cover/contain
        const type = background.image?.size === "cover" || background.image?.size === "contain" ? "frame" : "tile";
        // Quotes, parentheses and spaces percent-encoded, as in the CSS url()
        const src = imageUrl.replace(/["'()\s]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`);
        return `<v:fill type="${type}" src="${escapeHtml(src)}"${color ? ` color="${escapeHtml(color)}"` : ""} />`;
    }
    return "";
}
