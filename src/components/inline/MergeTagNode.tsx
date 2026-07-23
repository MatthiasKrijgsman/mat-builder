import type { ReactNode } from "react";
import {
    $applyNodeReplacement,
    $getSelection,
    $isRangeSelection,
    DecoratorNode,
    type DOMConversionMap,
    type DOMConversionOutput,
    type DOMExportOutput,
    type LexicalNode,
    type NodeKey,
    type SerializedLexicalNode,
    type Spread,
} from "lexical";
import { parseTextStyle } from "../../email/rich-text/styles.ts";

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
 *
 * `style` is a text-node-style inline CSS string ($patchStyleText syntax) so
 * the chip scales with per-selection typography: $patchStyleText only touches
 * TextNodes, so the size snapshot at insert and the font-size control's
 * selection patch ($patchSelectedMergeTags) write it here explicitly. The
 * wrapper span carries the style; the chip's own 0.85em resolves against it.
 */

export type SerializedMergeTagNode = Spread<
    { token: string; label?: string; style?: string },
    SerializedLexicalNode
>;

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
    __style: string;

    static getType(): string {
        return "merge-tag";
    }

    static clone(node: MergeTagNode): MergeTagNode {
        return new MergeTagNode(node.__token, node.__label, node.__style, node.__key);
    }

    constructor(token: string, label: string, style = "", key?: NodeKey) {
        super(key);
        this.__token = token;
        this.__label = label;
        this.__style = style;
    }

    static importJSON(serialized: SerializedMergeTagNode): MergeTagNode {
        return $createMergeTagNode(serialized.token, serialized.label ?? serialized.token, serialized.style ?? "");
    }

    exportJSON(): SerializedMergeTagNode {
        return {
            ...super.exportJSON(),
            token: this.__token,
            label: this.__label,
            ...(this.__style ? { style: this.__style } : undefined),
        };
    }

    getStyle(): string {
        return this.getLatest().__style;
    }

    setStyle(style: string): this {
        const writable = this.getWritable();
        writable.__style = style;
        return writable;
    }

    createDOM(): HTMLElement {
        // Slot for the decorated React chip. The typography snapshot goes on
        // this wrapper (whitelisted, same filter as the idle-canvas render in
        // rich-text/render.tsx) so the chip's 0.85em resolves against it.
        const element = document.createElement("span");
        Object.assign(element.style, parseTextStyle(this.__style));
        return element;
    }

    updateDOM(prevNode: this): boolean {
        // Style changed → recreate the wrapper with the new snapshot.
        return prevNode.__style !== this.__style;
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
        if (this.__style) element.setAttribute("style", this.__style);
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
                        return { node: $createMergeTagNode(token, label, span.getAttribute("style") ?? "") };
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

export function $createMergeTagNode(token: string, label: string, style = ""): MergeTagNode {
    return $applyNodeReplacement(new MergeTagNode(token, label, style));
}

export function $isMergeTagNode(node: LexicalNode | null | undefined): node is MergeTagNode {
    return node instanceof MergeTagNode;
}

/** Merges a $patchStyleText-shaped patch into a text-node-style CSS string
 * (null deletes a property; insertion order is preserved). */
export function mergeStyleString(style: string, patch: Record<string, string | null>): string {
    const declarations = new Map<string, string>();
    for (const declaration of style.split(";")) {
        const colon = declaration.indexOf(":");
        if (colon === -1) continue;
        const property = declaration.slice(0, colon).trim().toLowerCase();
        const value = declaration.slice(colon + 1).trim();
        if (property && value) declarations.set(property, value);
    }
    for (const [property, value] of Object.entries(patch)) {
        if (value === null) declarations.delete(property);
        else declarations.set(property, value);
    }
    return Array.from(declarations, ([property, value]) => `${property}: ${value}`).join(";");
}

/** Applies a style patch to every merge-tag node inside the current range
 * selection — the companion to $patchStyleText, which only touches TextNodes
 * and silently skips decorator chips. */
export function $patchSelectedMergeTags(patch: Record<string, string | null>): void {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    for (const node of selection.getNodes()) {
        if ($isMergeTagNode(node)) node.setStyle(mergeStyleString(node.getStyle(), patch));
    }
}
