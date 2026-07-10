import { createStore, type StoreApi } from "zustand/vanilla";
import {
    canDropAt,
    createHistory,
    duplicateBlock,
    findAncestors,
    findLocation,
    insertBlock,
    moveBlock,
    recordHistory,
    redo,
    removeBlock,
    setDocument,
    undo,
    updateProps,
} from "../core/index.ts";
import type { BlockRegistry } from "../core/registry.ts";
import type { BlockId, BlockLocation, BuilderDocument, HistoryState } from "../core/types.ts";
import type { MergeTag } from "./merge-tags.ts";

/*
 * Per-instance editor store — see docs/03-architecture.md §3.
 *
 * A zustand vanilla store created inside <BuilderProvider>; two builders on
 * one page share nothing. Actions are the only writers: they run the core
 * commands, record history (coalesced for updateProps) and notify the
 * host through the mutable callbacks object the provider keeps fresh.
 * Invalid operations (bad drop target, deleting the root, …) are no-ops
 * that return null/false — UI wiring should never throw.
 */

export interface EditorCallbacks {
    onChange?: (document: BuilderDocument) => void;
    onSelectionChange?: (id: BlockId | null) => void;
}

/** Live during a drag (source only — drop targets keep their own edge state). */
export type DragState =
    | { kind: "new-block"; blockType: string }
    | { kind: "move-block"; blockId: BlockId };

/** An inline text editing session: one editable field of one block. */
export interface EditingTarget {
    blockId: BlockId;
    /** The prop being edited — distinguishes multiple text areas in one block. */
    field: string;
}

/** User-dragged artboard frame size (see Artboard's preferred size). */
export interface ArtboardSize {
    width: number;
    height: number;
}

export interface EditorActions {
    select(id: BlockId | null): void;
    hover(id: BlockId | null): void;
    /** Persists the user-dragged artboard size so surface swaps (edit ⇄ preview) keep it */
    setArtboardSize(size: ArtboardSize): void;
    /** Enters inline editing for a block field (also selects the block) */
    startEditing(id: BlockId, field: string): void;
    stopEditing(): void;
    /** Drag lifecycle — set by the provider's DnD monitor */
    setDrag(drag: DragState | null): void;
    /** Layers tree expand state */
    setExpanded(id: BlockId, expanded: boolean): void;
    toggleExpanded(id: BlockId): void;
    /** Expands all ancestors so the block's layers row is visible */
    revealBlock(id: BlockId): void;
    /** Inserts a new block and selects it; null when the location is invalid */
    insertBlock(type: string, at: BlockLocation): BlockId | null;
    moveBlock(id: BlockId, to: BlockLocation): boolean;
    /** Shallow-merges a patch; history-coalesced so a typing burst is one undo step */
    updateProps(id: BlockId, patch: Record<string, unknown>): void;
    /** Removes the block's subtree; selection falls back to the parent */
    removeBlock(id: BlockId): boolean;
    /** Clones the block after itself and selects the clone; null when refused */
    duplicateBlock(id: BlockId): BlockId | null;
    /** Load/replace as a user action: migrates, validates (throws on errors), records history */
    loadDocument(document: BuilderDocument): void;
    undo(): void;
    redo(): void;
}

export interface EditorState {
    document: BuilderDocument;
    selectedId: BlockId | null;
    hoveredId: BlockId | null;
    /** Active inline editing session, or null. A mounted inline editor must
     * never go stale against the document, so anything that changes the
     * document out from under it (drag, undo/redo, load) clears this. */
    editing: EditingTarget | null;
    /** Layers tree expand state */
    expanded: Set<BlockId>;
    drag: DragState | null;
    /** Consumer-provided personalization tokens (provider prop); empty hides
     * all merge-tag UI. Editor configuration, not document state — never in
     * history snapshots. */
    mergeTags: MergeTag[];
    /** The artboard size the user last dragged — null until a drag. UI state
     * shared by every artboard surface (Canvas, EmailPreview, …) so swapping
     * surfaces retains the frame; never in history snapshots. */
    artboardSize: ArtboardSize | null;
    history: HistoryState;
    actions: EditorActions;
}

export type EditorStore = StoreApi<EditorState>;

export interface CreateEditorStoreOptions {
    registry: BlockRegistry;
    document: BuilderDocument;
    /** Consumer-provided personalization tokens (see merge-tags.ts) */
    mergeTags?: MergeTag[];
    /** Mutable — the provider reassigns its fields every render so callbacks never go stale */
    callbacks?: EditorCallbacks;
    /** Timestamp source for history coalescing; injectable for tests */
    now?: () => number;
}

export function createEditorStore(options: CreateEditorStoreOptions): EditorStore {
    const { registry, callbacks = {}, now = Date.now } = options;

    const store = createStore<EditorState>()((set, get) => {
        /** Snapshot of the current state for the history stack */
        const snapshot = () => ({ document: get().document, selectedId: get().selectedId });

        const commitDocument = (document: BuilderDocument, history: HistoryState) => {
            set({ document, history });
            callbacks.onChange?.(document);
        };

        const select = (id: BlockId | null) => {
            // Selecting anything else ends an inline editing session — this is
            // the "click outside" exit (portal popovers never reach canvas
            // click handlers, so they don't end the session).
            if (get().editing && get().editing!.blockId !== id) set({ editing: null });
            if (get().selectedId === id) return;
            set({ selectedId: id });
            callbacks.onSelectionChange?.(id);
        };

        /** Restores a history entry (undo/redo target) */
        const restore = (result: { history: HistoryState; entry: { document: BuilderDocument; selectedId: BlockId | null } } | null) => {
            if (!result) return;
            const previousSelection = get().selectedId;
            set({ document: result.entry.document, selectedId: result.entry.selectedId, history: result.history, editing: null });
            callbacks.onChange?.(result.entry.document);
            if (previousSelection !== result.entry.selectedId) {
                callbacks.onSelectionChange?.(result.entry.selectedId);
            }
        };

        return {
            document: options.document,
            selectedId: null,
            hoveredId: null,
            editing: null,
            // Everything starts expanded; newly created parents auto-expand (docs/04 §LayersPanel)
            expanded: new Set<BlockId>(Object.keys(options.document.blocks)),
            drag: null,
            mergeTags: options.mergeTags ?? [],
            artboardSize: null,
            history: createHistory(),

            actions: {
                select,
                hover: (id) => {
                    if (get().hoveredId !== id) set({ hoveredId: id });
                },
                setArtboardSize: (artboardSize) => {
                    const current = get().artboardSize;
                    if (current?.width === artboardSize.width && current?.height === artboardSize.height) return;
                    set({ artboardSize });
                },
                startEditing: (id, field) => {
                    if (!get().document.blocks[id]) return;
                    select(id);
                    const editing = get().editing;
                    if (editing?.blockId === id && editing.field === field) return;
                    set({ editing: { blockId: id, field } });
                },
                stopEditing: () => {
                    if (get().editing) set({ editing: null });
                },
                setDrag: (drag) => {
                    // A drag also clears hover — the hover chrome must not fight drop indicators
                    set(drag ? { drag, hoveredId: null, editing: null } : { drag });
                },
                setExpanded: (id, expanded) => {
                    const current = get().expanded;
                    if (current.has(id) === expanded) return;
                    const next = new Set(current);
                    if (expanded) next.add(id);
                    else next.delete(id);
                    set({ expanded: next });
                },
                toggleExpanded: (id) => {
                    get().actions.setExpanded(id, !get().expanded.has(id));
                },
                revealBlock: (id) => {
                    const ancestors = findAncestors(get().document, id);
                    if (ancestors.every((ancestorId) => get().expanded.has(ancestorId))) return;
                    set({ expanded: new Set([...get().expanded, ...ancestors]) });
                },

                insertBlock: (type, at) => {
                    const state = get();
                    if (!registry.has(type) || !canDropAt(state.document, registry, type, at)) return null;
                    const history = recordHistory(state.history, snapshot(), { timestamp: now() });
                    const { document, blockId } = insertBlock(state.document, { type, at }, registry);
                    commitDocument(document, history);
                    set({ expanded: new Set([...get().expanded, blockId]) }); // new parents start expanded
                    select(blockId);
                    return blockId;
                },

                moveBlock: (id, to) => {
                    const state = get();
                    const node = state.document.blocks[id];
                    const from = findLocation(state.document, id);
                    if (!node || !from) return false;
                    // Same-position drop: succeed without a commit or history entry
                    // (to.index is pre-move, so both "before self" and "after self" match)
                    if (
                        from.parentId === to.parentId &&
                        from.container === to.container &&
                        (to.index === from.index || to.index === from.index + 1)
                    ) {
                        return true;
                    }
                    if (!canDropAt(state.document, registry, node.type, to, id)) return false;
                    const history = recordHistory(state.history, snapshot(), { timestamp: now() });
                    commitDocument(moveBlock(state.document, { id, to }, registry), history);
                    return true;
                },

                updateProps: (id, patch) => {
                    const state = get();
                    if (!state.document.blocks[id]) return;
                    const history = recordHistory(state.history, snapshot(), {
                        timestamp: now(),
                        coalesceKey: `updateProps:${id}`,
                    });
                    commitDocument(updateProps(state.document, { id, patch }), history);
                },

                removeBlock: (id) => {
                    const state = get();
                    const node = state.document.blocks[id];
                    if (!node || id === state.document.rootId) return false;
                    if (registry.getDefinition(node.type)?.canDelete === false) return false;
                    const parent = findLocation(state.document, id)?.parentId ?? null;
                    const history = recordHistory(state.history, snapshot(), { timestamp: now() });
                    commitDocument(removeBlock(state.document, { id }, registry), history);
                    select(parent);
                    return true;
                },

                duplicateBlock: (id) => {
                    const state = get();
                    const node = state.document.blocks[id];
                    const location = findLocation(state.document, id);
                    if (!node || !location) return null;
                    if (!canDropAt(state.document, registry, node.type, { ...location, index: location.index + 1 })) {
                        return null;
                    }
                    const history = recordHistory(state.history, snapshot(), { timestamp: now() });
                    const { document, blockId } = duplicateBlock(state.document, { id }, registry);
                    commitDocument(document, history);
                    select(blockId);
                    return blockId;
                },

                loadDocument: (next) => {
                    const document = setDocument(next, registry);
                    const history = recordHistory(get().history, snapshot(), { timestamp: now() });
                    commitDocument(document, history);
                    set({ expanded: new Set(Object.keys(document.blocks)), editing: null });
                    if (get().selectedId && !document.blocks[get().selectedId as BlockId]) select(null);
                },

                undo: () => restore(undo(get().history, snapshot())),
                redo: () => restore(redo(get().history, snapshot())),
            },
        };
    });

    return store;
}

/**
 * Controlled-prop sync: the host passed a `value` we did not emit (an external
 * replacement, e.g. loaded from a server). Replaces the document WITHOUT
 * firing onChange, clears history (entries from another document lineage
 * would restore unrelated states) and drops a now-dangling selection.
 */
export function syncExternalDocument(store: EditorStore, next: BuilderDocument, registry: BlockRegistry): void {
    const document = setDocument(next, registry);
    const { selectedId } = store.getState();
    store.setState({
        document,
        history: createHistory(),
        selectedId: selectedId && document.blocks[selectedId] ? selectedId : null,
        hoveredId: null,
        editing: null,
        expanded: new Set(Object.keys(document.blocks)),
    });
}
