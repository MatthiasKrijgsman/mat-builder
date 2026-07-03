import { useStore } from "zustand";
import type { AnyBlockDefinition, BlockRegistry } from "../core/registry.ts";
import type { BlockId, BlockNode } from "../core/types.ts";
import { useBuilderContext } from "./context.ts";
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

export interface SelectedBlock {
    id: BlockId;
    node: BlockNode;
    /** undefined for unknown types (removed from the registry) */
    definition: AnyBlockDefinition | undefined;
}

export function useSelectedBlock(): SelectedBlock | null {
    const { registry } = useBuilderContext();
    const id = useBuilderState((s) => s.selectedId);
    const node = useBuilderState((s) => (s.selectedId ? s.document.blocks[s.selectedId] : undefined));
    if (!id || !node) return null;
    return { id, node, definition: registry.getDefinition(node.type) };
}
