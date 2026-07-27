import type { ReactElement } from "react";
import type { BlockContext } from "../core/types.ts";

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
    ctx: BlockContext,
) => ReactElement | null;

// Renderers with different P coexist in the registry map — P is erased there.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyEmailRenderer = EmailRenderer<any>;
