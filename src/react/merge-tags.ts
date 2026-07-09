/*
 * Merge tags — consumer-provided personalization tokens (docs/06 §merge tags).
 * The library never assumes a delimiter syntax: each tag carries the literal
 * token string its ESP expects, and the exported HTML emits it verbatim.
 * Inserted tags snapshot their token/label into the document, so rendering
 * never depends on the provider's current tag list.
 */

export interface MergeTag {
    /** The literal token emitted into the exported HTML — e.g. `{{first_name}}` or `*|FNAME|*`. */
    token: string;
    /** Human-readable name shown in insert menus and on canvas chips. */
    label: string;
    /** Optional group name — tags sharing one render under a labeled section
     * in the insert menu. Sections (and ungrouped tags) keep the order of
     * their first appearance in the provider's tag list. */
    group?: string;
}
