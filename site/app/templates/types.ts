import type { BuilderDocument, MergeTag } from "@matthiaskrijgsman/mat-builder";

/*
 * The playground's template library — the documents a host's backend would
 * own, kept in this browser's localStorage so the static demo has real
 * persistence instead of a save that goes nowhere.
 */

/** One saved template: the document, the personalization tokens offered for
 * it, and the name the picker shows. Stored verbatim as JSON, so everything
 * on it has to survive a round trip through `JSON.stringify`. */
export interface StoredTemplate {
    id: string;
    /** Picker label, and the top bar's trailing breadcrumb while it is open */
    name: string;
    mergeTags: MergeTag[];
    document: BuilderDocument;
}
