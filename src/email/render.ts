import { pretty, render } from "@react-email/render";
import { cloneElement, createElement, Fragment, isValidElement, type ReactElement } from "react";
import type { BlockId, BlockLocation, BuilderDocument } from "../core/types.ts";
import { safeUrl } from "../core/safe-url.ts";
import { hasVisibilityRules, isBlockVisible, type BlockVisibility, type MergeTagValues } from "../core/visibility.ts";
import { emailRootEmail } from "./blocks/email-root/email.tsx";
import { containerEmail } from "./blocks/container/email.tsx";
import { textEmail } from "./blocks/text/email.tsx";
import { buttonEmail } from "./blocks/button/email.tsx";
import { imageEmail } from "./blocks/image/email.tsx";
import { dividerEmail } from "./blocks/divider/email.tsx";
import { spacerEmail } from "./blocks/spacer/email.tsx";
import { tableCellEmail, tableEmail, tableRowEmail } from "./blocks/table/email.tsx";
import type { AnyEmailRenderer, EmailBlockContext, EmailBlockOverride, EmailChildNode } from "./types.ts";
import { childNode, childWidth } from "./width.ts";
import { isSlotRef } from "../core/compose.ts";
import type { BlockSpec } from "../core/types.ts";
import { emailRootDefaults } from "./blocks/email-root/styles.ts";
import { applyMso, elementEnd, escapeHtml } from "./mso.ts";
import { applyLightOnly } from "./light-only.ts";
import { emailContainerDefaults } from "./blocks/container/styles.ts";
import { emailTextDefaults } from "./blocks/text/styles.ts";
import { emailButtonDefaults } from "./blocks/button/styles.ts";
import { emailImageDefaults } from "./blocks/image/styles.ts";
import { emailDividerDefaults } from "./blocks/divider/styles.ts";
import { emailSpacerDefaults } from "./blocks/spacer/styles.ts";
import { emailTableCellDefaults, emailTableDefaults, emailTableRowDefaults } from "./blocks/table/styles.ts";

/*
 * @matthiaskrijgsman/mat-builder/email/render — server-safe export pipeline
 * (docs/06 §Export pipeline). Imported from API/server code (Next.js route
 * handlers, server actions) to turn a BuilderDocument into email HTML: it
 * must never import editor code, mat-ui, or anything client-only — the vite
 * build intentionally omits the "use client" banner for this chunk.
 * Components come from react-email; render/pretty from @react-email/render
 * (both optional peers — only consumers of the email preset install them).
 */

export type { EmailRenderer, AnyEmailRenderer, EmailBlockOverride, EmailBlockContext, EmailChildNode } from "./types.ts";
// The "keep light colors" pass renderEmail runs for a root with colorScheme "light".
export { applyLightOnly } from "./light-only.ts";
// Outlook-only markup (conditional comments), for custom renderers.
export { msoOnly, hideFromMso, vmlGradientAngle } from "./mso.ts";
// Available-width resolution, for a custom parent block that sizes its children.
export { boxWidth, childNode, childWidth, emailChildProps, emailChildWidths, type ChildWidth } from "./width.ts";
// Composed blocks: the spec vocabulary and its helpers (pure — docs/08).
export { slot, isSlotRef, collectSlots, collectBindings } from "../core/compose.ts";
export type { BlockSpec, ContainerSlotRef, BlockCompose, BlockContext } from "../core/types.ts";
// Style-props vocabulary (value types + pure toCss converters) — server-safe,
// re-exported so backend/custom-renderer code never touches the client entry.
export * from "../style-props/index.ts";
// Stored rich text: the pure serializer + content builders (server-safe —
// walks plain JSON, no lexical import; docs/06).
export * from "./rich-text/index.ts";
export { withVerticalGap } from "./gap.ts";
// Responsive stacking (docs/06 §Responsive output): what a custom root or
// container renderer needs to keep the output stacking on phones.
export { MOBILE_BREAKPOINT, STACK_CLASS, stackGapClass, responsiveStackingCss } from "./blocks/container/styles.ts";
// The URL allow-list the renderers apply to every href/src, for custom
// renderers to apply to theirs.
export { safeUrl } from "../core/safe-url.ts";
// Document loading, for a server that validates before it renders. All pure
// (docs/03 §1); the registry arguments are optional here because a server
// has no block definitions — see each function for what that skips.
// `createDocument` is deliberately absent: it needs the definitions.
export {
    DOCUMENT_VERSION,
    loadDocument,
    migrateDocument,
    repairDocument,
    validateDocument,
} from "../core/document.ts";
export type {
    BlockId,
    BlockNode,
    BuilderDocument,
    BlockLocation,
    LoadedDocument,
    ValidationIssue,
    ValidationIssueCode,
} from "../core/types.ts";
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

/**
 * Default props per preset block type — the server-side half of each block's
 * `defaultProps`. A composed block's spec only names the props it wants to
 * set, so the walk has to fill the rest in exactly as the editor does, or the
 * canvas and the output would disagree about everything left unsaid.
 *
 * These come from each block's `styles.ts`, which imports nothing but
 * `style-props` and the rich-text vocabulary — server-safe by construction.
 */
export const emailBlockDefaults = {
    "email-root": emailRootDefaults,
    container: emailContainerDefaults,
    text: emailTextDefaults,
    button: emailButtonDefaults,
    image: emailImageDefaults,
    divider: emailDividerDefaults,
    spacer: emailSpacerDefaults,
    table: emailTableDefaults,
    "table-row": emailTableRowDefaults,
    "table-cell": emailTableCellDefaults,
    // Erased at the boundary: the props types differ per block and the walk
    // only ever spreads them, exactly like `emailRenderers` above.
} as unknown as Record<string, Record<string, unknown>>;

/** Guards a definition cycle — a composite that composes itself. */
const MAX_COMPOSE_DEPTH = 16;

/** Everything the walk needs to resolve one block type, preset or host-supplied. */
interface Resolver {
    render(type: string): AnyEmailRenderer | undefined;
    compose(type: string): EmailBlockOverride["compose"] | undefined;
    defaults(type: string): Record<string, unknown>;
}

function makeResolver(blocks: readonly EmailBlockOverride[] = []): Resolver {
    const byType = new Map(blocks.map((block) => [block.type, block]));
    return {
        // A host entry wins over the preset, so a consumer can replace a
        // preset block's output as well as add their own.
        render: (type) => byType.get(type)?.render ?? emailRenderers[type],
        compose: (type) => byType.get(type)?.compose,
        defaults: (type) => (byType.get(type)?.defaultProps as Record<string, unknown>) ?? emailBlockDefaults[type] ?? {},
    };
}

/**
 * Renders one node of a composed tree — docs/08 §4.
 *
 * The whole point: a composed block emits nothing of its own. Every element
 * in the output came from a block that already knows how to be email, so a
 * consumer cannot express markup that breaks in Outlook.
 *
 * `slotChildren` are the COMPOSITE's real container children, spliced in
 * wherever the spec references a slot.
 */
function renderSpec(
    spec: BlockSpec,
    slotChildren: Record<string, ReactElement[]>,
    ctx: EmailBlockContext,
    resolve: Resolver,
    depth: number,
    options: BuildEmailTreeOptions,
    /** The props to render with when the parent adjusted them (./width.ts §childProps) */
    resolvedProps?: Record<string, unknown>,
): ReactElement | null {
    if (depth > MAX_COMPOSE_DEPTH) return null;
    const props = resolvedProps ?? { ...resolve.defaults(spec.type), ...spec.props };

    // A composed block may compose another — recurse before looking for a
    // renderer it does not have.
    const compose = resolve.compose(spec.type);
    if (compose) return renderSpec(compose(props, ctx), slotChildren, ctx, resolve, depth + 1, options);

    const renderer = resolve.render(spec.type);
    if (!renderer) return unknownBlock(spec.type, undefined, options);

    const children: Record<string, ReactElement[]> = {};
    const childNodes: Record<string, EmailChildNode[]> = {};
    for (const [container, value] of Object.entries(spec.children ?? {})) {
        if (isSlotRef(value)) {
            // Slot children were built with the composite; their sizes are not
            // known here, so a row sizing its columns sees them as Fill.
            children[container] = slotChildren[value.__slot] ?? [];
            childNodes[container] = children[container].map(() => ({ type: "", props: {}, ownProps: {} }));
            continue;
        }
        const nodes = value.map((child) =>
            childNode(spec.type, props, child.type, { ...resolve.defaults(child.type), ...child.props }),
        );
        childNodes[container] = nodes;
        children[container] = value.map((child, index) => {
            const availableWidth = childWidth(spec.type, props, ctx.availableWidth, container, index, nodes, ctx.siblingCount);
            const childCtx = { ...ctx, availableWidth, siblingCount: value.length, childNodes: {} };
            return createElement(
                Fragment,
                { key: index },
                renderSpec(child, slotChildren, childCtx, resolve, depth + 1, options, nodes[index].props),
            );
        });
    }
    return renderer(props, children, { ...ctx, childNodes });
}

export interface BuildEmailTreeOptions {
    /** Merge-tag values, keyed by literal token, that conditional blocks are
     * resolved against (core/visibility.ts). Omit and every block renders. */
    values?: MergeTagValues;
    /**
     * Host block definitions this document uses — composed blocks (`compose`)
     * and custom primitives (`render`), plus their `defaultProps` (docs/08 §4).
     *
     * `compose` lives on a block definition, and this entry may never import
     * the editor, so a host puts its `compose` and `defaultProps` in a
     * server-safe module and spreads them into `defineBlock` on the client.
     * That is natural rather than awkward: `compose` returns data, not JSX.
     *
     * An entry whose `type` matches a preset block REPLACES it, same rule as
     * `mergeBlockDefinitions` on the editor side.
     */
    blocks?: readonly EmailBlockOverride[];
    /**
     * Throw on a block type no renderer knows, instead of rendering it as
     * nothing. Off by default — a document may outlive a block, and one
     * unknown block should not kill a send — but a server that would rather
     * fail a render than ship an email with a hole in it turns this on.
     */
    strict?: boolean;
    /**
     * Emit conditional blocks for the ESP to evaluate instead of resolving
     * them here (docs/06 §Conditional visibility). With an adapter, `values`
     * no longer hides anything: every block renders, and each one carrying
     * rules is handed to `wrap` as finished HTML to be enclosed in the host's
     * template syntax. `substituteTokens` still works alongside it.
     */
    conditionals?: ConditionalAdapter;
}

/**
 * The host's template language, as one function (docs/06 §Conditional
 * visibility). `html` is the block's complete rendered markup — outer tag
 * included — and the return value replaces it verbatim, so a Liquid host
 * returns `{% if … %}${html}{% endif %}`. The library assumes no delimiter
 * syntax for tokens and none for conditionals either; translating the rule
 * (`rule.match`, `rule.rules[].operator`…) is the host's job.
 */
export interface ConditionalAdapter {
    wrap(html: string, rule: BlockVisibility, block: { id: BlockId; type: string }): string;
}

/*
 * How a conditional block reaches `wrap` (docs/06). React escapes `"`/`&`/`<`
 * in text children, so the template syntax cannot be emitted from the tree;
 * and wrapping the block in a sentinel ELEMENT would not survive `pretty`,
 * whose HTML parser foster-parents anything but a <td> out of a <tr>. So
 * the block's own outermost element is marked with an attribute — those
 * survive both React and the prettifier untouched — and a pass over the
 * final HTML finds each marked tag, walks to its matching close tag, and
 * hands the slice to the adapter. Innermost markers are wrapped last: the
 * adapter's output contains the inner HTML verbatim, markers included, so
 * the loop simply continues until none are left.
 */
const CONDITIONAL_ATTRIBUTE = "data-mb-cond";

/** Marks the outermost element of a conditional block's render (no-op without an adapter or rules). */
function markConditional(rendered: ReactElement | null, node: { id: BlockId; visibility?: BlockVisibility }, options: BuildEmailTreeOptions): ReactElement | null {
    if (!rendered || !options.conditionals || !hasVisibilityRules(node.visibility)) return rendered;
    // react-email's components spread unknown props onto their element; a
    // fragment has nothing to carry the attribute, so it gets a wrapper.
    return isValidElement(rendered) && rendered.type !== Fragment
        ? cloneElement(rendered as ReactElement<Record<string, unknown>>, { [CONDITIONAL_ATTRIBUTE]: node.id })
        : createElement("div", { [CONDITIONAL_ATTRIBUTE]: node.id }, rendered);
}

/** Replaces every marked element in the rendered HTML with the adapter's wrapping of it. */
export function applyConditionals(html: string, adapter: ConditionalAdapter, document: BuilderDocument): string {
    const marker = new RegExp(`\\s${CONDITIONAL_ATTRIBUTE}=(?:"([^"]*)"|'([^']*)')`);
    for (let guard = 0; guard < 10_000; guard++) {
        const match = marker.exec(html);
        if (!match) return html;
        const id = match[1] ?? match[2] ?? "";
        const node = document.blocks[id];
        const start = html.lastIndexOf("<", match.index);
        const tag = /^<([a-zA-Z][\w-]*)/.exec(html.slice(start))?.[1]?.toLowerCase() ?? "";
        const openEnd = html.indexOf(">", match.index + match[0].length) + 1;
        const end = elementEnd(html, tag, openEnd);
        if (end < 0) throw new Error(`applyConditionals: no closing </${tag}> for block "${id}"`);
        // The attribute is ours, not the author's — it leaves with the marker
        const element = html.slice(start, end).replace(match[0], "");
        const wrapped = node?.visibility ? adapter.wrap(element, node.visibility, { id, type: node.type }) : element;
        html = html.slice(0, start) + wrapped + html.slice(end);
    }
    throw new Error("applyConditionals: too many conditional markers");
}

/** The one place an unknown block type is decided: skipped, or refused under `strict`. */
function unknownBlock(type: string, id: BlockId | undefined, options: BuildEmailTreeOptions): null {
    if (options.strict) {
        throw new Error(
            `renderEmail: no email renderer for block type "${type}"${id ? ` (block "${id}")` : ""} — pass it in \`blocks\`, or drop \`strict\` to render it as nothing`,
        );
    }
    return null;
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
    /** The block's available width in px at the design width (./width.ts) —
     * computed by the walk; a caller rendering a subtree may pass its own. */
    availableWidth: number = emailRootDefaults.contentWidth,
    /** The props to render with when the parent adjusted them (./width.ts §childProps) */
    resolvedProps?: Record<string, unknown>,
): ReactElement | null {
    const node = document.blocks[id];
    if (!node) return null;
    const resolve = makeResolver(options.blocks);
    const compose = resolve.compose(node.type);
    const renderer = compose ? undefined : resolve.render(node.type);
    if (!compose && !renderer) return unknownBlock(node.type, id, options);
    // With an adapter the ESP decides, so nothing is hidden here — every
    // block renders and the conditional ones get marked (markConditional).
    const values = options.conditionals ? undefined : options.values;
    // Child lists are pre-filtered below, so this only fires for a hidden
    // block the caller asked for directly (including the root).
    if (!isBlockVisible(node, values)) return null;

    const siblingCount = location
        ? (visibleChildIds(document, location.parentId, location.container, values).length || 1)
        : 1;
    // Defaults under the stored props, for both paths alike. `materializeBlock`
    // makes props complete at creation, so this is normally a no-op — it earns
    // its keep on documents saved before a block gained a prop, and it must
    // match what the canvas does or the two surfaces drift (docs/08 §4).
    const props = resolvedProps ?? { ...resolve.defaults(node.type), ...node.props };
    const children: Record<string, ReactElement[]> = {};
    const childNodes: Record<string, EmailChildNode[]> = {};
    for (const container of Object.keys(node.children)) {
        const ids = visibleChildIds(document, id, container, values);
        const nodes = ids.map((childId) => {
            const child = document.blocks[childId];
            const type = child?.type ?? "";
            return childNode(node.type, props, type, { ...resolve.defaults(type), ...child?.props });
        });
        childNodes[container] = nodes;
        children[container] = ids.map((childId, index) =>
            createElement(
                Fragment,
                { key: childId },
                buildEmailTree(
                    document,
                    childId,
                    { parentId: id, container, index },
                    options,
                    childWidth(node.type, props, availableWidth, container, index, nodes, siblingCount),
                    nodes[index].props,
                ),
            ),
        );
    }
    const ctx: EmailBlockContext = { document, location, siblingCount, availableWidth, childNodes };

    if (compose) {
        // Composed: the node's children are its SLOT children, spliced into
        // the tree wherever the spec references them.
        return markConditional(renderSpec(compose(props, ctx), children, ctx, resolve, 0, options), node, options);
    }
    return markConditional(renderer!(props, children, ctx), node, options);
}

export interface RenderedEmail {
    /** Full-document HTML, prettified unless `pretty: false` — hand this to the ESP */
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
    /**
     * Prettify the HTML (the default). The prettifier reflows long text and
     * can break a line inside a merge-tag token (`{{\n  first_name }}`), which
     * some template languages and any substring check will not recognise —
     * pass `false` to get the render's own single-line output instead.
     */
    pretty?: boolean;
}

/*
 * React escapes these five in text AND in attribute values, so a token
 * containing any of them appears in the rendered HTML in escaped form —
 * `{{a&b}}` lands as `{{a&amp;b}}`. Substitution therefore looks for both
 * spellings, and escapes the value it splices in (`escapeHtml`, ./mso.ts).
 */
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

/*
 * Substitution happens after React has escaped the tree, so a merge-tag value
 * lands in an `href` with no scheme check at all — `{"{{link}}": "javascript:…"}`
 * would otherwise become a live link in the preview and the sent email. This
 * pass re-applies the allow-list to every URL-bearing attribute of the final
 * HTML; a refused value becomes an empty attribute. React double-quotes
 * attribute values and prettier may re-quote them with single quotes, so
 * both spellings are matched; the value is entity-decoded before the check
 * because `substitute` escaped it.
 */
const URL_ATTRIBUTE = /\b(href|src|background|action|formaction|poster)=(?:"([^"]*)"|'([^']*)')/gi;
const ENTITY_DECODES: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#x27;": "'",
    "&#39;": "'",
};
const decodeEntities = (value: string): string =>
    value.replace(/&(?:amp|lt|gt|quot|#x27|#39);/g, (entity) => ENTITY_DECODES[entity] ?? entity);

export function sanitizeUrlAttributes(html: string): string {
    return html.replace(URL_ATTRIBUTE, (match, name: string, doubleQuoted?: string, singleQuoted?: string) => {
        const raw = doubleQuoted ?? singleQuoted ?? "";
        if (raw.trim() === "") return match;
        return safeUrl(decodeEntities(raw)) === undefined ? `${name}=""` : match;
    });
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
    const rendered = await render(tree);
    const prettified = options.pretty === false ? rendered : await pretty(rendered);
    const text = await render(tree, { plainText: true });
    const values = options.substituteTokens ? (options.values ?? {}) : null;
    // Outlook's conditional comments first (./mso.ts), so the substitution
    // and the URL pass below reach the markup inside them too.
    // "Keep light colors" (./light-only.ts) runs first, while the Outlook
    // markup is still encoded in its markers and so left alone.
    const root = document.blocks[document.rootId]?.props as { colorScheme?: string } | undefined;
    // On unless the root opts out: absent reads as the default, "light"
    const outlook = applyMso(root?.colorScheme === "auto" ? prettified : applyLightOnly(prettified));
    const personalized = sanitizeUrlAttributes(values ? substitute(outlook, values, true) : outlook);
    // Conditionals wrap LAST: after prettifying, because the adapter's syntax
    // is not HTML and must not go through an HTML parser; after substitution
    // and sanitizing, so neither pass ever rewrites the host's own syntax
    // (a rule names its tokens — `{% if {{plan}} … %}` — and those must stay).
    return {
        html: options.conditionals ? applyConditionals(personalized, options.conditionals, document) : personalized,
        text: values ? substitute(text, values, false) : text,
    };
}
