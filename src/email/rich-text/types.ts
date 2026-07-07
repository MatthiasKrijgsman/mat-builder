/*
 * Hand-written shapes for the serialized Lexical editor state stored in text
 * block props (docs/06). This module is consumed by the server-safe email
 * renderer, so the shapes are declared here instead of importing lexical:
 * the stored document is plain JSON and the renderer only ever walks it.
 *
 * Tolerance rule: unknown node types render their children; unknown fields
 * are ignored. Editor upgrades must never make stored documents unrenderable.
 */

/** Serialized NodeState bag (lexical stores it under the `"$"` key). */
export interface RichNodeState {
    /** Paragraph/heading line-height multiplier (see LINE_HEIGHT_STATE_KEY). */
    lineHeight?: number;
    [key: string]: unknown;
}

export interface RichNodeBase {
    type: string;
    version?: number;
    $?: RichNodeState;
}

export interface RichTextNode extends RichNodeBase {
    type: "text";
    text: string;
    /** Bitmask — see TEXT_FORMAT in styles.ts (bold 1, italic 2, …). */
    format?: number;
    /** Inline CSS string written by $patchStyleText. */
    style?: string;
    mode?: string;
    detail?: number;
}

export interface RichElementNode extends RichNodeBase {
    children?: RichNode[];
    /** Element format = text alignment: "" | left | start | center | right | end | justify. */
    format?: string | number;
    indent?: number;
    direction?: "ltr" | "rtl" | null;
}

export interface RichHeadingNode extends RichElementNode {
    type: "heading";
    tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

export interface RichListNode extends RichElementNode {
    type: "list";
    listType: "bullet" | "number" | "check";
    tag: "ul" | "ol";
    start?: number;
}

export interface RichListItemNode extends RichElementNode {
    type: "listitem";
    value?: number;
    checked?: boolean;
}

export interface RichLinkNode extends RichElementNode {
    type: "link" | "autolink";
    url: string;
    target?: string | null;
    rel?: string | null;
    title?: string | null;
}

export interface RichLineBreakNode extends RichNodeBase {
    type: "linebreak";
}

/** Personalization token (docs/06 §merge tags). The output render emits
 * `token` verbatim; `label` is a display-name snapshot for canvas chips. */
export interface RichMergeTagNode extends RichNodeBase {
    type: "merge-tag";
    token: string;
    label?: string;
}

export type RichNode =
    | RichTextNode
    | RichHeadingNode
    | RichListNode
    | RichListItemNode
    | RichLinkNode
    | RichLineBreakNode
    | RichMergeTagNode
    | RichElementNode;

export interface RichRootNode extends RichElementNode {
    type: "root";
}

/** The full serialized editor state: `JSON.stringify(editorState.toJSON())`. */
export interface RichTextDocument {
    root: RichRootNode;
}
