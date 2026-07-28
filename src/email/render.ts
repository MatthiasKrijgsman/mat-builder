import { pretty, render } from "@react-email/render";
import { createElement, Fragment, type ReactElement } from "react";
import type { BlockId, BlockLocation, BuilderDocument } from "../core/types.ts";
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
 * Walks the flat document map and builds the react-email element tree.
 * Unknown block types are skipped (same tolerance as the editor canvas).
 */
export function buildEmailTree(
    document: BuilderDocument,
    id: BlockId = document.rootId,
    /** Where `id` sits — threaded down the walk so context-styled blocks (a
     * table cell) can resolve their row/table without re-searching the map. */
    location: BlockLocation | null = null,
): ReactElement | null {
    const node = document.blocks[id];
    if (!node) return null;
    const renderer = emailRenderers[node.type];
    if (!renderer) return null;

    const children = Object.fromEntries(
        Object.entries(node.children).map(([container, childIds]) => [
            container,
            childIds.map((childId, index) =>
                createElement(
                    Fragment,
                    { key: childId },
                    buildEmailTree(document, childId, { parentId: id, container, index }),
                ),
            ),
        ]),
    );
    const siblingCount = location
        ? (document.blocks[location.parentId]?.children[location.container]?.length ?? 1)
        : 1;
    return renderer(node.props, children, { document, location, siblingCount });
}

export interface RenderedEmail {
    /** Prettified full-document HTML — hand this to the ESP */
    html: string;
    /** Plain-text variant */
    text: string;
}

export async function renderEmail(document: BuilderDocument): Promise<RenderedEmail> {
    const tree = buildEmailTree(document);
    if (!tree) {
        const rootType = document.blocks[document.rootId]?.type ?? "(missing root)";
        throw new Error(`renderEmail: no email renderer for root block type "${rootType}"`);
    }
    return {
        html: await pretty(await render(tree)),
        text: await render(tree, { plainText: true }),
    };
}
