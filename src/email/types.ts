import type { ReactElement } from "react";

/*
 * Shared email-preset types — server-safe (imported by both the client
 * preset entry and ./email/render). See docs/06-email-builder.md.
 */

/** Output render for one block: props + pre-built children per container → react-email tree (null = render nothing, e.g. an image without a src). */
export type EmailRenderer<P = Record<string, unknown>> = (
    props: P,
    children: Record<string, ReactElement[]>,
) => ReactElement | null;

// Renderers with different P coexist in the registry map — P is erased there.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyEmailRenderer = EmailRenderer<any>;
