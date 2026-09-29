import type { ReactElement } from "react";
import type { BlockContext, BlockSpec } from "../core/types.ts";

/*
 * Shared email-preset types — server-safe (imported by both the client
 * preset entry and ./email/render). See docs/06-email-builder.md.
 */

/**
 * Output render for one block: props + pre-built children per container →
 * react-email tree (null = render nothing, e.g. an image without a src).
 *
 * `ctx` is the block's position in the document, for the rare block whose
 * styling depends on its surroundings (a table cell resolving the table's
 * border mode) — the same context the canvas hands `getWrapperProps`, so both
 * renders agree. Self-contained blocks ignore it.
 */
export type EmailRenderer<P = Record<string, unknown>> = (
    props: P,
    children: Record<string, ReactElement[]>,
    ctx: EmailBlockContext,
) => ReactElement | null;

/**
 * The walk's context for an output render: the block's place in the document
 * plus its available width in px at the design width (./width.ts) — what a
 * renderer puts in the `width` attributes Outlook on Windows reads instead of CSS.
 */
export interface EmailBlockContext extends BlockContext {
    availableWidth: number;
    /**
     * This block's visible children per container, with the props they render
     * with (defaults filled in, adjusted by `emailChildProps`) — what a parent
     * that sizes its children from theirs reads (an auto row). A composite's
     * slot children appear with an empty type and props.
     */
    childNodes: Record<string, EmailChildNode[]>;
}

/** A child as its parent's renderer sees it. */
export interface EmailChildNode {
    type: string;
    /** What the child renders with (after `emailChildProps`) */
    props: Record<string, unknown>;
    /** Its own props, before the parent adjusted them — what it claims a column with */
    ownProps: Record<string, unknown>;
}

// Renderers with different P coexist in the registry map — P is erased there.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyEmailRenderer = EmailRenderer<any>;

/**
 * A host block the output pipeline needs to know about — docs/08 §4.
 *
 * Exactly one of `compose` / `render` is meaningful per entry:
 *
 * - `compose` — a composed block. Nothing to write per surface: the walk
 *   renders the tree from blocks that already handle email.
 * - `render` — a custom primitive, or a replacement for a preset block's
 *   output. The escape hatch for markup composition cannot express (docs/08 §8).
 *
 * `defaultProps` fills in what a spec or a stored node leaves unsaid, exactly
 * as the editor's `defineBlock` does. Without it the two surfaces would
 * disagree about every prop nobody set explicitly.
 */
export interface EmailBlockOverride<P = any> { // eslint-disable-line @typescript-eslint/no-explicit-any
    type: string;
    defaultProps?: P;
    compose?: (props: P, ctx: BlockContext) => BlockSpec;
    render?: EmailRenderer<P>;
}
