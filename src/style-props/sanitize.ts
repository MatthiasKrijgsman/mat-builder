import { safeUrl } from "../core/safe-url.ts";

/*
 * Value guards for everything a stored document can put into an inline
 * style. The email output serializes style objects to `style="…"` strings,
 * so a color of `#fff;background-image:url(https://evil/px.gif)` would
 * otherwise become a second declaration — a tracking pixel or an overlay
 * smuggled in through a document. The canvas assigns styles through the
 * CSSOM (no breakout possible there), so these guards cost nothing on the
 * editor side and close the hole on the output side.
 *
 * Every guard returns `undefined` (or a fallback) for anything it does not
 * recognise, and the converters emit nothing for that property.
 */

const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNCTIONAL = /^(?:rgba?|hsla?)\(\s*[\d.]+%?(?:\s*[,\s]\s*[\d.]+%?){2}(?:\s*[,/]\s*[\d.]+%?)?\s*\)$/i;
const KEYWORD = /^[a-z]+$/i;

/** A color: `#rgb[a]`/`#rrggbb[aa]`, `rgb[a]()`/`hsl[a]()` with numeric
 * arguments, or a bare keyword (`transparent`, `red`). Nothing else. */
export const cssColor = (value: unknown): string | undefined => {
    if (typeof value !== "string") return undefined;
    const color = value.trim();
    return HEX.test(color) || FUNCTIONAL.test(color) || KEYWORD.test(color) ? color : undefined;
};

/** A font-family list: names, quotes, commas, spaces and hyphens — none of
 * the characters that could end a declaration or open a function. */
const FONT_FAMILY = /^[\w\s,'"-]+$/;
export const cssFontFamily = (value: unknown): string | undefined =>
    typeof value === "string" && FONT_FAMILY.test(value) && value.trim() !== "" ? value.trim() : undefined;

/** A finite number, or the fallback (documents hand-edited to `"12"`,
 * `null` or `NaN` must not print those into a length). */
export const cssNumber = (value: unknown, fallback = 0): number =>
    typeof value === "number" && Number.isFinite(value) ? value : fallback;

/** A length a stored string may carry: `30%`, `120px`, `1.5em`, `auto`. */
const LENGTH = /^(?:auto|-?\d*\.?\d+(?:px|%|em|rem|pt)?)$/;
export const cssLength = (value: unknown): string | undefined => {
    if (typeof value === "number") return Number.isFinite(value) ? `${value}px` : undefined;
    if (typeof value !== "string") return undefined;
    const length = value.trim();
    return LENGTH.test(length) ? length : undefined;
};

/** One of a fixed set of keywords, or the fallback. */
export const cssKeyword = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
    (allowed as readonly unknown[]).includes(value) ? (value as T) : fallback;

/** `url("…")` for a background image: scheme-checked by `safeUrl`, then
 * quoted with every character that could close the string or the function
 * percent-encoded. `undefined` when the URL is missing or refused. */
export const cssUrl = (value: unknown): string | undefined => {
    const url = safeUrl(value);
    if (!url) return undefined;
    const encoded = url.replace(/[\s"'()\\]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`);
    return `url("${encoded}")`;
};
