import { pretty, render } from "@react-email/render";
import { createElement, Fragment, type ReactElement } from "react";
import type { BlockId, BlockLocation, BuilderDocument } from "../core/types.ts";
import { isBlockVisible, type MergeTagValues } from "../core/visibility.ts";
import { emailRootEmail } from "./blocks/email-root/email.tsx";
import { containerEmail } from "./blocks/container/email.tsx";
import { textEmail } from "./blocks/text/email.tsx";
import { buttonEmail } from "./blocks/button/email.tsx";
import { imageEmail } from "./blocks/image/email.tsx";
import { dividerEmail } from "./blocks/divider/email.tsx";
import { spacerEmail } from "./blocks/spacer/email.tsx";
import { tableCellEmail, tableEmail, tableRowEmail } from "./blocks/table/email.tsx";
import type { AnyEmailRenderer } from "./types.ts";

/*
 * @matthiaskrijgsman/mat-builder/email/render — server-safe export pipeline
 * (docs/06 §Export pipeline). Imported from API/server code (Next.js route
 * handlers, server actions) to turn a BuilderDocument into email HTML: it
 * must never import editor code, mat-ui, or anything client-only — the vite
 * build intentionally omits the "use client" banner for this chunk.
 * Components come from react-email; render/pretty from @react-email/render
 * (both optional peers — only consumers of the email preset install them).
 */

export type { EmailRenderer, AnyEmailRenderer } from "./types.ts";
// Style-props vocabulary (value types + pure toCss converters) — server-safe,
// re-exported so backend/custom-renderer code never touches the client entry.
export * from "../style-props/index.ts";
// Stored rich text: the pure serializer + content builders (server-safe —
// walks plain JSON, no lexical import; docs/06).
export * from "./rich-text/index.ts";
export { withVerticalGap } from "./gap.ts";
// Conditional visibility: the rule vocabulary and its evaluator, so a backend
// resolving conditions itself never has to reach into the client entry.
export {
    describeVisibility,
    evaluateRule,
    hasVisibilityRules,
    isBlockVisible,
    isVisible,
    OPERATOR_LABELS,
    VALUE_OPERATORS,
} from "../core/visibility.ts";
export type {
    BlockVisibility,
    MergeTagValues,
    VisibilityOperator,
    VisibilityRule,
} from "../core/visibility.ts";

/** Output renderer per block type — the server-side counterpart of the editor preset. */
export const emailRenderers: Record<string, AnyEmailRenderer> = {
    "email-root": emailRootEmail,
    container: containerEmail,
    text: textEmail,
    button: buttonEmail,
    image: imageEmail,
    divider: dividerEmail,
    spacer: spacerEmail,
    table: tableEmail,
    "table-row": tableRowEmail,
    "table-cell": tableCellEmail,
};

export interface BuildEmailTreeOptions {
    /** Merge-tag values, keyed by literal token, that conditional blocks are
     * resolved against (core/visibility.ts). Omit and every block renders. */
    values?: MergeTagValues;
}

/**
 * A container's children minus the ones their visibility rules exclude.
 *
 * Hidden blocks are dropped from the CHILD LISTS rather than returning null
 * from their own render, so the surviving siblings still see a correct
 * `index`/`siblingCount` — a horizontal container splits its width across the
 * visible columns, and a table cell picks its corner radii from where it
 * actually ended up.
 */
function visibleChildIds(
    document: BuilderDocument,
    parentId: BlockId,
    container: string,
    values: MergeTagValues | undefined,
): BlockId[] {
    const ids = document.blocks[parentId]?.children[container] ?? [];
    if (!values) return ids;
    return ids.filter((id) => isBlockVisible(document.blocks[id], values));
}

/**
 * Walks the flat document map and builds the react-email element tree.
 * Unknown block types are skipped (same tolerance as the editor canvas), and
 * so are blocks whose visibility rules don't hold for `options.values`.
 */
export function buildEmailTree(
    document: BuilderDocument,
    id: BlockId = document.rootId,
    /** Where `id` sits — threaded down the walk so context-styled blocks (a
     * table cell) can resolve their row/table without re-searching the map. */
    location: BlockLocation | null = null,
    options: BuildEmailTreeOptions = {},
): ReactElement | null {
    const node = document.blocks[id];
    if (!node) return null;
    const renderer = emailRenderers[node.type];
    if (!renderer) return null;
    // Child lists are pre-filtered below, so this only fires for a hidden
    // block the caller asked for directly (including the root).
    if (!isBlockVisible(node, options.values)) return null;

    const children = Object.fromEntries(
        Object.keys(node.children).map((container) => [
            container,
            visibleChildIds(document, id, container, options.values).map((childId, index) =>
                createElement(
                    Fragment,
                    { key: childId },
                    buildEmailTree(document, childId, { parentId: id, container, index }, options),
                ),
            ),
        ]),
    );
    const siblingCount = location
        ? (visibleChildIds(document, location.parentId, location.container, options.values).length || 1)
        : 1;
    return renderer(node.props, children, { document, location, siblingCount });
}

export interface RenderedEmail {
    /** Prettified full-document HTML — hand this to the ESP */
    html: string;
    /** Plain-text variant */
    text: string;
}

export interface RenderEmailOptions extends BuildEmailTreeOptions {
    /**
     * Also replace each token in `values` with its value in the output, so
     * the rendered email is personalized rather than tokenized. Off by
     * default: the normal pipeline hands tokens to the ESP and lets IT
     * substitute — turn this on only when you are rendering per recipient.
     */
    substituteTokens?: boolean;
}

/*
 * React escapes these five in text AND in attribute values, so a token
 * containing any of them appears in the rendered HTML in escaped form —
 * `{{a&b}}` lands as `{{a&amp;b}}`. Substitution therefore looks for both
 * spellings, and escapes the value it splices in.
 */
const HTML_ESCAPES: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
};
const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Replaces merge-tag tokens with their values. A post-render string pass
 * rather than a hook in the walk, because tokens live in arbitrary string
 * props — rich-text nodes, a button label, a query parameter inside an href
 * — and one pass over the output catches them all identically.
 */
function substitute(output: string, values: MergeTagValues, escaped: boolean): string {
    // One alternation over every spelling, so a value that happens to contain
    // another token is never substituted a second time. Longest first: a
    // token that is a prefix of another must not win.
    const replacements = new Map<string, string>();
    for (const [token, value] of Object.entries(values)) {
        if (!token) continue;
        const replacement = escaped ? escapeHtml(value) : value;
        replacements.set(token, replacement);
        if (escaped) replacements.set(escapeHtml(token), replacement);
    }
    if (replacements.size === 0) return output;
    const pattern = [...replacements.keys()]
        .sort((a, b) => b.length - a.length)
        .map(escapeRegExp)
        .join("|");
    return output.replace(new RegExp(pattern, "g"), (match) => replacements.get(match) ?? match);
}

/**
 * Renders a document to email HTML and its plain-text variant.
 *
 * With no `values`, every block renders and tokens pass through verbatim —
 * the template-for-the-ESP case. Supply `values` to resolve conditional
 * blocks against real data (docs/06 §Conditional visibility), and add
 * `substituteTokens` to personalize the copy at the same time.
 */
export async function renderEmail(
    document: BuilderDocument,
    options: RenderEmailOptions = {},
): Promise<RenderedEmail> {
    const tree = buildEmailTree(document, document.rootId, null, options);
    if (!tree) {
        const rootType = document.blocks[document.rootId]?.type ?? "(missing root)";
        throw new Error(`renderEmail: no email renderer for root block type "${rootType}"`);
    }
    const html = await pretty(await render(tree));
    const text = await render(tree, { plainText: true });
    const values = options.substituteTokens ? (options.values ?? {}) : null;
    return {
        html: values ? substitute(html, values, true) : html,
        text: values ? substitute(text, values, false) : text,
    };
}
