import { useEffect, useState, type ReactNode } from "react";
import { createRegistry, setDocument, type AnyBlockDefinition } from "../core/index.ts";
import type { BlockId, BuilderDocument } from "../core/types.ts";
import { useDndMonitor } from "../dnd/monitor.ts";
import { BuilderContext, type BuilderContextValue } from "./context.ts";
import type { MergeTag } from "./merge-tags.ts";
import { createEditorStore, syncExternalDocument, type EditorCallbacks } from "./store.ts";

/*
 * <BuilderProvider> — see docs/03-architecture.md §3 (controlled component
 * contract) and docs/04 (composition). Creates the per-instance store and
 * registry; the host arranges Canvas/Inspector/... freely as children.
 */

export interface BuilderProviderProps {
    /** The block definitions this builder can edit — fixed for the instance's lifetime */
    blocks: AnyBlockDefinition[];
    /** Controlled document (pass the value back from onChange) … */
    value?: BuilderDocument;
    /** … or an initial document for uncontrolled usage */
    defaultValue?: BuilderDocument;
    /** Called after every committed command (debounce upstream for saving) */
    onChange?: (document: BuilderDocument) => void;
    onSelectionChange?: (id: BlockId | null) => void;
    /** Personalization tokens available in text surfaces (see merge-tags.ts);
     * omit or pass empty to hide all merge-tag UI. Pass a stable array. */
    mergeTags?: MergeTag[];
    children: ReactNode;
}

/** Stable empty list so an omitted `mergeTags` prop never churns the store. */
const NO_MERGE_TAGS: MergeTag[] = [];

export function BuilderProvider(props: BuilderProviderProps) {
    const { blocks, value, defaultValue, onChange, onSelectionChange, mergeTags, children } = props;

    const [instance] = useState<BuilderContextValue & { callbacks: EditorCallbacks }>(() => {
        const registry = createRegistry(blocks);
        const initial = value ?? defaultValue;
        if (!initial) {
            throw new Error("BuilderProvider requires a `value` or `defaultValue` document");
        }
        const callbacks: EditorCallbacks = {};
        const store = createEditorStore({ registry, document: setDocument(initial, registry), mergeTags, callbacks });
        return { store, registry, callbacks, instanceId: Symbol("mat-builder-instance") };
    });

    // Reassigned every render so store actions always call the latest handlers
    instance.callbacks.onChange = onChange;
    instance.callbacks.onSelectionChange = onSelectionChange;

    // One monitor per provider performs all DnD mutations (docs/05 §4)
    useDndMonitor(instance);

    // Controlled sync: a `value` we did not emit is an external replacement.
    // (Values passed back from onChange are reference-equal and skipped.)
    useEffect(() => {
        if (value && value !== instance.store.getState().document) {
            syncExternalDocument(instance.store, value, instance.registry);
        }
    }, [value, instance]);

    // Merge tags are plain editor configuration — keep the store's copy fresh
    useEffect(() => {
        const next = mergeTags ?? NO_MERGE_TAGS;
        if (next !== instance.store.getState().mergeTags) {
            instance.store.setState({ mergeTags: next });
        }
    }, [mergeTags, instance]);

    return <BuilderContext.Provider value={instance}>{children}</BuilderContext.Provider>;
}
