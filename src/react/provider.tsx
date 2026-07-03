import { useEffect, useState, type ReactNode } from "react";
import { createRegistry, setDocument, type AnyBlockDefinition } from "../core/index.ts";
import type { BlockId, BuilderDocument } from "../core/types.ts";
import { BuilderContext, type BuilderContextValue } from "./context.ts";
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
    children: ReactNode;
}

export function BuilderProvider(props: BuilderProviderProps) {
    const { blocks, value, defaultValue, onChange, onSelectionChange, children } = props;

    const [instance] = useState<BuilderContextValue & { callbacks: EditorCallbacks }>(() => {
        const registry = createRegistry(blocks);
        const initial = value ?? defaultValue;
        if (!initial) {
            throw new Error("BuilderProvider requires a `value` or `defaultValue` document");
        }
        const callbacks: EditorCallbacks = {};
        const store = createEditorStore({ registry, document: setDocument(initial, registry), callbacks });
        return { store, registry, callbacks };
    });

    // Reassigned every render so store actions always call the latest handlers
    instance.callbacks.onChange = onChange;
    instance.callbacks.onSelectionChange = onSelectionChange;

    // Controlled sync: a `value` we did not emit is an external replacement.
    // (Values passed back from onChange are reference-equal and skipped.)
    useEffect(() => {
        if (value && value !== instance.store.getState().document) {
            syncExternalDocument(instance.store, value, instance.registry);
        }
    }, [value, instance]);

    return <BuilderContext.Provider value={instance}>{children}</BuilderContext.Provider>;
}
