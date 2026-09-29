/*
 * "Keep light colors" (docs/06 §Dark mode) — asks mail clients not to
 * recolor the email in dark mode. Server-safe, a post-render pass over the
 * finished HTML.
 *
 * No email can switch dark mode off everywhere. What this does:
 *
 * - `color-scheme: light only` (meta tags + a :root rule). Apple Mail on
 *   macOS/iOS honours it and keeps the email as designed.
 * - Outlook.com (and Outlook's apps where they share its engine) recolor
 *   partially, and mark each element they changed with `data-ogsc` (text) /
 *   `data-ogsb` (background). Rules on those attributes put the original
 *   colors back: every inline text and background color in the output gets
 *   a class naming it, and one `!important` rule per color restores it.
 *
 * Gmail's apps and classic Outlook for Windows invert regardless — nothing
 * in the HTML opts out there, and the known tricks (background-image fills,
 * blend modes) are fragile or make text unreadable, so none are applied.
 */

const LIGHT_ONLY_META =
    '<meta name="color-scheme" content="light only" /><meta name="supported-color-schemes" content="light only" />';

/** The declarations restored, per kind: [class prefix, CSS property, Outlook.com marker]. */
const KINDS = [
    ["mb-lc", "color", "data-ogsc"],
    ["mb-lb", "background-color", "data-ogsb"],
] as const;

const TAG_WITH_STYLE = /<([a-zA-Z][\w-]*)(\s[^<>]*?)?\sstyle="([^"]*)"([^<>]*)>/g;

/** The value of `property` in an inline style string (the last one wins, as in CSS). */
function declared(style: string, property: string): string | undefined {
    let value: string | undefined;
    for (const part of style.split(";")) {
        const colon = part.indexOf(":");
        if (colon < 0) continue;
        if (part.slice(0, colon).trim().toLowerCase() === property) value = part.slice(colon + 1).trim();
    }
    return value && value !== "inherit" && value !== "transparent" ? value : undefined;
}

export function applyLightOnly(html: string): string {
    // One class per distinct value and kind, numbered in order of appearance
    const classes = new Map<string, string>();
    const rules: string[] = [];
    const classFor = (kind: (typeof KINDS)[number], value: string): string => {
        const key = `${kind[1]}\u0000${value}`;
        let name = classes.get(key);
        if (!name) {
            name = `${kind[0]}${classes.size}`;
            classes.set(key, name);
            // Both the element itself and anything under a marked ancestor:
            // Outlook.com puts the marker on the element it recolored
            rules.push(`[${kind[2]}] .${name}, .${name}[${kind[2]}] { ${kind[1]}: ${value} !important; }`);
        }
        return name;
    };

    const marked = html.replace(TAG_WITH_STYLE, (tag, name: string, before = "", style: string, after: string) => {
        // Entities in the style attribute are React's escaping; CSS needs the characters
        const css = style.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, "&");
        const added = KINDS.map((kind) => {
            const value = declared(css, kind[1]);
            return value && !/[{}<>]/.test(value) ? classFor(kind, value) : undefined;
        }).filter((cls): cls is string => cls !== undefined);
        if (added.length === 0) return tag;
        const attributes = `${before}${after}`;
        const existing = /\sclass="([^"]*)"/.exec(attributes);
        if (existing) {
            return tag.replace(existing[0], ` class="${existing[1]} ${added.join(" ")}"`);
        }
        return `<${name} class="${added.join(" ")}"${tag.slice(name.length + 1)}`;
    });

    const style = `<style>:root { color-scheme: light only; supported-color-schemes: light only; } ${rules.join(" ")}</style>`;
    return marked.replace(/<head\b[^>]*>/i, (open) => `${open}${LIGHT_ONLY_META}${style}`);
}
