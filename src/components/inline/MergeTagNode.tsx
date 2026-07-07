import type { ReactNode } from "react";
import {
    $applyNodeReplacement,
    DecoratorNode,
    type DOMConversionMap,
    type DOMConversionOutput,
    type DOMExportOutput,
    type LexicalNode,
    type NodeKey,
    type SerializedLexicalNode,
    type Spread,
} from "lexical";

/*
 * MergeTagNode — the editing-surface half of merge tags (docs/06 §merge tags).
 * An inline decorator: the canvas shows the human label as an atomic chip
 * (selected/deleted as one unit, caret can't enter), while every text
 * projection — getTextContent, plain-text clipboard, and the server-safe
 * output walker (rich-text/render.tsx, which never imports this module) —
 * carries the literal `token` for the ESP to substitute after send.
 *
 * The node snapshots token AND label at insert time, so stored documents
 * render chips even when the current provider has a different (or no) tag
 * list. Serialized shape mirrors RichMergeTagNode in rich-text/types.ts.
 */

export type SerializedMergeTagNode = Spread<{ token: string; label?: string }, SerializedLexicalNode>;

/** The visual chip — shared by the Lexical decorator and the idle canvas
 * (InlineRichText's renderMergeTag) so both modes are pixel-identical. */
export function MergeTagChip({ label }: { label: string }) {
    return <span className="mat-builder-rt-merge-tag">{label}</span>;
}

const TOKEN_ATTRIBUTE = "data-mat-builder-merge-tag";
const LABEL_ATTRIBUTE = "data-mat-builder-merge-tag-label";

export class MergeTagNode extends DecoratorNode<ReactNode> {
    __token: string;
    __label: string;

    static getType(): string {
        return "merge-tag";
    }

    static clone(node: MergeTagNode): MergeTagNode {
        return new MergeTagNode(node.__token, node.__label, node.__key);
    }

    constructor(token: string, label: string, key?: NodeKey) {
        super(key);
        this.__token = token;
        this.__label = label;
    }

    static importJSON(serialized: SerializedMergeTagNode): MergeTagNode {
        return $createMergeTagNode(serialized.token, serialized.label ?? serialized.token);
    }

    exportJSON(): SerializedMergeTagNode {
        return { ...super.exportJSON(), token: this.__token, label: this.__label };
    }

    createDOM(): HTMLElement {
        // Bare slot — the chip itself is the decorated React child.
        return document.createElement("span");
    }

    updateDOM(): boolean {
        return false;
    }

    isInline(): boolean {
        return true;
    }

    isKeyboardSelectable(): boolean {
        return true;
    }

    getTextContent(): string {
        return this.__token;
    }

    /** HTML clipboard: a data-attributed span round-trips between builder
     * instances; anything else pasting it gets the literal token text. */
    exportDOM(): DOMExportOutput {
        const element = document.createElement("span");
        element.setAttribute(TOKEN_ATTRIBUTE, this.__token);
        element.setAttribute(LABEL_ATTRIBUTE, this.__label);
        element.textContent = this.__token;
        return { element };
    }

    static importDOM(): DOMConversionMap | null {
        return {
            span: (element: HTMLElement) => {
                if (!element.hasAttribute(TOKEN_ATTRIBUTE)) return null;
                return {
                    conversion: (span: HTMLElement): DOMConversionOutput => {
                        const token = span.getAttribute(TOKEN_ATTRIBUTE) ?? "";
                        const label = span.getAttribute(LABEL_ATTRIBUTE) ?? token;
                        return { node: $createMergeTagNode(token, label) };
                    },
                    priority: 2,
                };
            },
        };
    }

    decorate(): ReactNode {
        return <MergeTagChip label={this.__label} />;
    }
}

export function $createMergeTagNode(token: string, label: string): MergeTagNode {
    return $applyNodeReplacement(new MergeTagNode(token, label));
}

export function $isMergeTagNode(node: LexicalNode | null | undefined): node is MergeTagNode {
    return node instanceof MergeTagNode;
}
