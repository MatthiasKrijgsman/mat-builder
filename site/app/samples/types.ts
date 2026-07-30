import type { BuilderDocument, MergeTag } from "@matthiaskrijgsman/mat-builder";

/** One template the playground can open — a document plus the personalization
 * tokens a host would offer for it (docs/06 §merge tags). */
export interface EmailSample {
    id: string;
    /** Picker label, and the top bar's trailing breadcrumb while it is open */
    name: string;
    mergeTags: MergeTag[];
    document: BuilderDocument;
}
