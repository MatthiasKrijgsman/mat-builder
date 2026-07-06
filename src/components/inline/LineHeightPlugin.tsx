import { useEffect, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
    $getSelection,
    $getState,
    $isParagraphNode,
    $isRangeSelection,
    $setState,
    createState,
    ParagraphNode,
    type ElementNode,
    type LexicalEditor,
} from "lexical";
import { $isHeadingNode, HeadingNode } from "@lexical/rich-text";
import { mergeRegister } from "@lexical/utils";
import { LINE_HEIGHT_STATE_KEY } from "../../email/rich-text/index.ts";

/*
 * Paragraph/heading line-height as a NodeState (docs/06): Lexical does NOT
 * serialize element `style`, so a plain node.setStyle() would silently drop
 * on save/reload. The multiplier persists under the node's `"$"` bag (where
 * the rich-text serializer reads it) and a node transform mirrors it into a
 * live inline style so the editor shows it. Transforms run on every existing
 * node at registration, so loaded documents style immediately.
 */

const lineHeightState = createState(LINE_HEIGHT_STATE_KEY, {
    parse: (jsonValue: unknown): number | undefined =>
        typeof jsonValue === "number" && jsonValue > 0 ? jsonValue : undefined,
});

/** The same %-form the serializer emits — keep in sync with rich-text/render.tsx. */
const lineHeightStyle = (multiplier: number | undefined): string =>
    multiplier === undefined ? "" : `line-height: ${Math.round(multiplier * 100)}%`;

const syncNodeStyle = (node: ElementNode): void => {
    const style = lineHeightStyle($getState(node, lineHeightState));
    if (node.getStyle() !== style) node.setStyle(style);
};

/** Block elements (paragraph/heading) covered by the current selection. */
const $selectedLineHeightTargets = (): ElementNode[] => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return [];
    const targets = new Map<string, ElementNode>();
    for (const node of selection.getNodes()) {
        const top = node.getTopLevelElement();
        if (top && ($isParagraphNode(top) || $isHeadingNode(top))) targets.set(top.getKey(), top);
    }
    return [...targets.values()];
};

/** Applies a line-height multiplier (null = clear) to the selected blocks. Call inside editor.update(). */
export const $setLineHeightOnSelection = (multiplier: number | null): void => {
    for (const node of $selectedLineHeightTargets()) {
        $setState(node, lineHeightState, multiplier ?? undefined);
    }
};

/** Current selection line-height multiplier; null when unset or mixed. */
export const useSelectionLineHeight = (editor: LexicalEditor): number | null => {
    const [value, setValue] = useState<number | null>(null);

    useEffect(() => {
        const read = () => {
            editor.getEditorState().read(() => {
                const targets = $selectedLineHeightTargets();
                const first = targets.length ? ($getState(targets[0], lineHeightState) ?? null) : null;
                const mixed = targets.some((node) => ($getState(node, lineHeightState) ?? null) !== first);
                setValue(mixed ? null : first);
            });
        };
        read();
        return editor.registerUpdateListener(() => read());
    }, [editor]);

    return value;
};

export function LineHeightPlugin() {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        return mergeRegister(
            editor.registerNodeTransform(ParagraphNode, syncNodeStyle),
            editor.registerNodeTransform(HeadingNode, syncNodeStyle),
        );
    }, [editor]);

    return null;
}
