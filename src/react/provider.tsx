import { useEffect, useState, type ReactNode } from "react";
import { createRegistry, loadDocument, type AnyBlockDefinition } from "../core/index.ts";
import type { BlockId, BlockPattern, BuilderDocument, ValidationIssue } from "../core/types.ts";
import { useDndMonitor } from "../dnd/monitor.ts";
import { BuilderContext, type BuilderContextValue } from "./context.ts";
import { resolveFeatures, sameFeatures, type BuilderFeatures } from "./features.ts";
import type { MergeTag } from "./merge-tags.ts";
import {
    createEditorStore,
    syncExternalDocument,
    type BlockErrorContext,
    type EditorCallbacks,
} from "./store.ts";

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
    /**
     * The document handed in (`value`/`defaultValue`, or a later external
     * `value`) needed repairs on the way in — dangling ids dropped, missing
     * containers added, defaults backfilled (core/document.ts `loadDocument`).
     * The editor opens either way; wire this to your logging, because it
     * means a stored document was not what this release expected. Fires
     * after mount. Only a document with no usable root refuses to load, and
     * that throws — render the provider inside an error boundary (the shell
     * brings its own).
     */
    onDocumentIssues?: (issues: ValidationIssue[]) => void;
    /**
     * A block's `editRender` or inspector threw. The block shows a fallback
     * in its place and the rest of the editor keeps working (an unsaved
     * document must survive one bad block); this is where the host reports
     * it.
     */
    onBlockError?: (error: unknown, context: BlockErrorContext) => void;
    /** Personalization tokens available in text surfaces (see merge-tags.ts);
     * omit or pass empty to hide all merge-tag UI. Pass a stable array. */
    mergeTags?: MergeTag[];
    /** Palette entries that expand into ordinary blocks on insert (docs/08 §7).
     * Not block definitions — they never enter the registry. Pass a stable array. */
    patterns?: BlockPattern[];
    /** Editor feature switches — all on by default. `{ visibility: false }`
     * hides the conditional-visibility UI for a host whose pipeline cannot
     * honour rules (see `BuilderFeatures`). */
    features?: BuilderFeatures;
    children: ReactNode;
}

/** Stable empty lists so omitted props never churn the store. */
const NO_MERGE_TAGS: MergeTag[] = [];
const NO_PATTERNS: BlockPattern[] = [];

interface Instance extends BuilderContextValue {
    /** Issues from the mount-time load, reported once the host can receive them */
    loadIssues: ValidationIssue[];
}

export function BuilderProvider(props: BuilderProviderProps) {
    const {
        blocks,
        value,
        defaultValue,
        onChange,
        onSelectionChange,
        onDocumentIssues,
        onBlockError,
        mergeTags,
        patterns,
        features,
        children,
    } = props;

    const [instance] = useState<Instance>(() => {
        const registry = createRegistry(blocks);
        const initial = value ?? defaultValue;
        if (!initial) {
            throw new Error("BuilderProvider requires a `value` or `defaultValue` document");
        }
        const callbacks: EditorCallbacks = {};
        const loaded = loadDocument(initial, registry);
        const store = createEditorStore({
            registry,
            document: loaded.document,
            mergeTags,
            patterns,
            features,
            callbacks,
        });
        return {
            store,
            registry,
            callbacks,
            instanceId: Symbol("mat-builder-instance"),
            // Filled in by <Canvas> on mount (see context.ts)
            canvasRef: { current: null },
            loadIssues: loaded.issues,
        };
    });

    // Reassigned every render so store actions always call the latest handlers
    instance.callbacks.onChange = onChange;
    instance.callbacks.onSelectionChange = onSelectionChange;
    instance.callbacks.onDocumentIssues = onDocumentIssues;
    instance.callbacks.onBlockError = onBlockError;

    // The mount-time load ran inside the state initializer, where a host
    // callback must not fire — report its issues once, after mount.
    useEffect(() => {
        const issues = instance.loadIssues;
        instance.loadIssues = [];
        if (issues.length > 0) instance.callbacks.onDocumentIssues?.(issues);
    }, [instance]);

    // One monitor per provider performs all DnD mutations (docs/05 §4)
    useDndMonitor(instance);

    // Controlled sync: a `value` we did not emit is an external replacement.
    // (Values passed back from onChange are reference-equal and skipped.)
    useEffect(() => {
        if (value && value !== instance.store.getState().document) {
            const issues = syncExternalDocument(instance.store, value, instance.registry);
            if (issues.length > 0) instance.callbacks.onDocumentIssues?.(issues);
        }
    }, [value, instance]);

    // Merge tags and patterns are plain editor configuration — keep the
    // store's copies fresh, same contract as any other provider prop.
    useEffect(() => {
        const next = mergeTags ?? NO_MERGE_TAGS;
        if (next !== instance.store.getState().mergeTags) {
            instance.store.setState({ mergeTags: next });
        }
    }, [mergeTags, instance]);

    useEffect(() => {
        const next = patterns ?? NO_PATTERNS;
        if (next !== instance.store.getState().patterns) {
            instance.store.setState({ patterns: next });
        }
    }, [patterns, instance]);

    // Compared by value: `features={{ visibility: false }}` is a fresh object
    // every host render and must not churn the store.
    useEffect(() => {
        const next = resolveFeatures(features);
        if (!sameFeatures(next, instance.store.getState().features)) {
            instance.store.setState({ features: next });
        }
    }, [features, instance]);

    return <BuilderContext.Provider value={instance}>{children}</BuilderContext.Provider>;
}
