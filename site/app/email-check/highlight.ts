/*
 * Finds the elements a caniemail feature refers to, so the page can outline
 * them in the preview — the link between "border-radius breaks in Outlook"
 * and "which blocks is that?". Browser only (DOMParser).
 *
 * doiuse-email names features by caniemail title, and those titles come in a
 * few shapes; anything else (`@media`, selectors) lives in a <style> block
 * and has no element to point at.
 */

type Matcher = (element: Element) => boolean;

function declarations(element: Element): [string, string][] {
    return (element.getAttribute("style") ?? "")
        .split(";")
        .map((part) => {
            const colon = part.indexOf(":");
            return [part.slice(0, colon).trim().toLowerCase(), part.slice(colon + 1).trim().toLowerCase()] as [string, string];
        })
        .filter(([property]) => property.length > 0);
}

function matcherFor(feature: string): Matcher | null {
    const tag = /^<([a-z0-9]+)> element$/i.exec(feature);
    if (tag) return (element) => element.tagName.toLowerCase() === tag[1].toLowerCase();

    const attribute = /^([a-z-]+) attribute$/i.exec(feature);
    if (attribute) return (element) => element.hasAttribute(attribute[1]);

    const withValue = /^([a-z-]+):\s*(.+)$/i.exec(feature);
    if (withValue) {
        const [, property, value] = withValue;
        return (element) =>
            declarations(element).some(([p, v]) => p === property.toLowerCase() && v.includes(value.toLowerCase()));
    }

    if (/^[a-z-]+$/i.test(feature)) {
        const property = feature.toLowerCase();
        return (element) => declarations(element).some(([p]) => p === property);
    }
    return null;
}

export const HIT_ATTRIBUTE = "data-email-check-hit";

/** Whether the page can point at this feature in the preview at all. */
export function canHighlight(feature: string): boolean {
    return matcherFor(feature) !== null;
}

/**
 * The HTML with every element using `feature` marked and outlined, plus how
 * many were marked. Returns the input untouched when there is nothing to mark.
 */
export function highlight(html: string, feature: string | null): { html: string; hits: number } {
    const matches = feature ? matcherFor(feature) : null;
    if (!matches) return { html, hits: 0 };

    const doc = new DOMParser().parseFromString(html, "text/html");
    let hits = 0;
    for (const element of doc.querySelectorAll("*")) {
        if (!matches(element)) continue;
        element.setAttribute(HIT_ATTRIBUTE, "");
        hits++;
    }
    const style = doc.createElement("style");
    style.textContent =
        `[${HIT_ATTRIBUTE}]{outline:2px solid #e11d48 !important;outline-offset:-1px;` +
        `box-shadow:0 0 0 4px rgb(225 29 72 / .25) !important}`;
    doc.head.append(style);
    // Keep the email's own doctype: it decides the rendering mode, and
    // react-email's XHTML one is not the same mode as `<!DOCTYPE html>`.
    const doctype = /^\s*<!doctype[^>]*>/i.exec(html)?.[0].trim() ?? "";
    return { html: doctype + doc.documentElement.outerHTML, hits };
}
