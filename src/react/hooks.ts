import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "zustand";
import type { AnyBlockDefinition, BlockRegistry } from "../core/registry.ts";
import type { BlockId, BlockNode } from "../core/types.ts";
import type { MergeTagValues } from "../core/visibility.ts";
import { useBuilderContext } from "./context.ts";
import type { ResolvedBuilderFeatures } from "./features.ts";
import { collectMergeTagUsage, type MergeTag, type MergeTagUsage } from "./merge-tags.ts";
import type { EditorActions, EditorState } from "./store.ts";

/*
 * Public hooks — see docs/03-architecture.md §4. All subscribe to slices of
 * the per-instance store, so canvas nodes re-render on their own block only.
 */

/** Selector escape hatch — subscribe to any slice of the editor state. */
export function useBuilderState<T>(selector: (state: EditorState) => T): T {
    const { store } = useBuilderContext();
    return useStore(store, selector);
}

export interface UseEditorResult extends EditorActions {
    canUndo: boolean;
    canRedo: boolean;
    selectedId: BlockId | null;
    registry: BlockRegistry;
}

/** Actions + history flags — everything needed to build custom toolbars/surfaces. */
export function useEditor(): UseEditorResult {
    const { store, registry } = useBuilderContext();
    const actions = useStore(store, (s) => s.actions);
    const canUndo = useStore(store, (s) => s.history.past.length > 0);
    const canRedo = useStore(store, (s) => s.history.future.length > 0);
    const selectedId = useStore(store, (s) => s.selectedId);
    return { ...actions, canUndo, canRedo, selectedId, registry };
}

/** Slice subscription to one block's node; undefined once the block is removed. */
export function useBlockNode(id: BlockId): BlockNode | undefined {
    return useBuilderState((s) => s.document.blocks[id]);
}

/** The provider's merge tags (see merge-tags.ts); empty when none configured. */
export function useMergeTags(): MergeTag[] {
    return useBuilderState((s) => s.mergeTags);
}

/** The provider's feature switches, every one resolved (see `BuilderFeatures`). */
export function useBuilderFeatures(): ResolvedBuilderFeatures {
    return useBuilderState((s) => s.features);
}

/** Stand-in merge-tag values the preview renders with (docs/06 §Preview data). */
export function useMergeTagValues(): MergeTagValues {
    return useBuilderState((s) => s.previewValues);
}

/**
 * The merge tags this document actually uses (docs/06 §Preview data) — what
 * the preview-data panel lists. Recomputed when the document or the tag list
 * changes; it walks every block's props, so don't call it per keystroke on
 * a hot path.
 */
export function useMergeTagUsage(): MergeTagUsage[] {
    const document = useBuilderState((s) => s.document);
    const tags = useMergeTags();
    return useMemo(() => collectMergeTagUsage(document, tags), [document, tags]);
}

export interface SelectedBlock {
    id: BlockId;
    node: BlockNode;
    /** undefined for unknown types (removed from the registry) */
    definition: AnyBlockDefinition | undefined;
}

/**
 * Marks the element inside a block's canvas render that carries the block's OWN
 * size — the `<img>` of an image, the `<a>` of a button. `useRenderedBlockSize`
 * measures it, so inspector fields can show what an auto-sized block resolved
 * to. Without the marker the measurement falls back to the block wrapper, which
 * is the space available to the block rather than the block itself.
 */
export const SIZE_BOX_CLASS = "mat-builder-size-box";

export interface RenderedSize {
    width: number;
    height: number;
}

/**
 * Live rendered size (layout px) of a block on this instance's canvas, or null
 * while it isn't mounted — no <Canvas>, or the block sits in an unrendered
 * branch. Feeds the dimension fields: an auto-sized block has no number in the
 * document, so the box reads its resolved size back off the canvas (docs/04).
 */
export function useRenderedBlockSize(id: BlockId | null | undefined): RenderedSize | null {
    const { canvasRef } = useBuilderContext();
    const [size, setSize] = useState<RenderedSize | null>(null);
    // Last measurement, so the frame loop can compare without re-rendering
    const last = useRef<RenderedSize | null>(null);

    useEffect(() => {
        last.current = null;
        if (!id) {
            setSize(null);
            return;
        }
        // Polled per frame, like the chrome overlay's placement (ChromeOverlay):
        // the measured element is not stable across renders (a block can even
        // swap tags — the image renders an <img> or a placeholder <div>), and a
        // commit anywhere can resize it. Only a CHANGED size reaches state, so a
        // steady canvas costs one layout read per frame and no React work.
        let raf = 0;
        const tick = () => {
            const box = sizeBox(canvasRef.current, id);
            const next = box ? { width: Math.round(box.offsetWidth), height: Math.round(box.offsetHeight) } : null;
            if (next?.width !== last.current?.width || next?.height !== last.current?.height) {
                last.current = next;
                setSize(next);
            }
            raf = requestAnimationFrame(tick);
        };
        tick();
        return () => cancelAnimationFrame(raf);
    }, [id, canvasRef]);

    return size;
}

/** The block's size box if it marked one, else its wrapper (see SIZE_BOX_CLASS). */
function sizeBox(canvas: HTMLElement | null, id: BlockId): HTMLElement | null {
    const block = canvas?.querySelector(`[data-block-id="${CSS.escape(id)}"]`);
    if (!(block instanceof HTMLElement)) return null;
    for (const marked of block.querySelectorAll(`.${SIZE_BOX_CLASS}`)) {
        // A marker found under a DESCENDANT block belongs to that block, not this one
        if (marked instanceof HTMLElement && marked.closest("[data-block-id]") === block) return marked;
    }
    return block;
}

export function useSelectedBlock(): SelectedBlock | null {
    const { registry } = useBuilderContext();
    const id = useBuilderState((s) => s.selectedId);
    const node = useBuilderState((s) => (s.selectedId ? s.document.blocks[s.selectedId] : undefined));
    if (!id || !node) return null;
    return { id, node, definition: registry.getDefinition(node.type) };
}
