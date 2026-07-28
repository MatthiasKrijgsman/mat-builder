import { useCallback, useEffect, useRef, useState } from "react";
import type { BuilderDocument } from "../core/types.ts";

/*
 * Save controller — the persistence half of the shell components (docs/04
 * §Shell). Deliberately outside the editor store: saving is host state, not
 * document state, and nothing in core/ may know about it.
 *
 * Dirtiness is driven by the provider's `onChange` (wire `onDocumentChange`
 * into <BuilderProvider onChange>), NOT by watching the store's document.
 * That distinction is the whole point: `onChange` fires for committed user
 * commands only, while an external `value` replacement (a document loaded
 * from the server) swaps the store's document silently — and a freshly
 * loaded document is by definition already saved.
 */

export type SaveStatus =
    /** Nothing edited yet since the last load/save */
    | "idle"
    /** Unsaved edits are pending */
    | "dirty"
    | "saving"
    /** Saved at least once, nothing pending */
    | "saved"
    /** The last save threw; the edits are still pending */
    | "error";

export interface UseDocumentSaveOptions {
    /** Persist the document. Rejecting surfaces as `status: "error"`; the
     * edits stay dirty so the next save (or retry) picks them up again. */
    onSave?: (document: BuilderDocument) => void | Promise<void>;
    /** Opt-in debounced background saves. Omit for manual-only (button/⌘S). */
    autoSaveMs?: number;
    onError?: (error: unknown) => void;
    /** Native "leave site?" prompt while edits are unsaved. Default true
     * whenever `onSave` is set. */
    warnOnUnload?: boolean;
    /** Bind ⌘/Ctrl+S on the window. Default true whenever `onSave` is set. */
    saveShortcut?: boolean;
}

export interface SaveController {
    status: SaveStatus;
    dirty: boolean;
    saving: boolean;
    /** Whatever the last `onSave` rejection threw, cleared by the next attempt */
    error: unknown;
    /** True when a host configured `onSave` — the shell hides its save UI otherwise */
    enabled: boolean;
    /** Saves the latest document; a no-op while a save is in flight or nothing is pending */
    save: () => Promise<void>;
    /** Wire into <BuilderProvider onChange> — this is what marks the document dirty */
    onDocumentChange: (document: BuilderDocument) => void;
}

/**
 * Dirty tracking + save orchestration for a builder instance. Usable on its
 * own for custom layouts; `<BuilderShell>` runs it for you.
 */
export function useDocumentSave(options: UseDocumentSaveOptions = {}): SaveController {
    const { onSave, autoSaveMs, onError, warnOnUnload, saveShortcut } = options;
    const enabled = Boolean(onSave);

    // Reassigned every render so an in-flight save never calls a stale handler
    const onSaveRef = useRef(onSave);
    const onErrorRef = useRef(onError);
    onSaveRef.current = onSave;
    onErrorRef.current = onError;

    /** Latest document from onChange; null while nothing has been edited */
    const pendingRef = useRef<BuilderDocument | null>(null);
    const savingRef = useRef(false);
    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const [savedOnce, setSavedOnce] = useState(false);
    /** Bumped by every edit so the autosave effect re-arms its timer per keystroke burst */
    const [revision, setRevision] = useState(0);

    const onDocumentChange = useCallback((document: BuilderDocument) => {
        pendingRef.current = document;
        setDirty(true);
        setRevision((value) => value + 1);
    }, []);

    const save = useCallback(async () => {
        const handler = onSaveRef.current;
        const document = pendingRef.current;
        // Nothing pending, no handler, or already in flight — the button is
        // disabled in those states, but ⌘S and autosave can still land here.
        if (!handler || !document || savingRef.current) return;

        savingRef.current = true;
        setSaving(true);
        setError(null);
        try {
            await handler(document);
            if (!mountedRef.current) return;
            // Edits made *during* the save leave a newer document pending, so
            // only this exact document counts as persisted.
            if (pendingRef.current === document) {
                pendingRef.current = null;
                setDirty(false);
            }
            setSavedOnce(true);
        } catch (saveError) {
            if (!mountedRef.current) return;
            setError(saveError);
            onErrorRef.current?.(saveError);
        } finally {
            savingRef.current = false;
            if (mountedRef.current) setSaving(false);
        }
    }, []);

    // Autosave: debounced per edit burst. A failed save does not retry on its
    // own — the next edit re-arms the timer, and the Save button retries now.
    useEffect(() => {
        if (!enabled || autoSaveMs === undefined || !dirty || saving) return;
        const timer = setTimeout(() => void save(), autoSaveMs);
        return () => clearTimeout(timer);
    }, [enabled, autoSaveMs, dirty, saving, revision, save]);

    useEffect(() => {
        if (!enabled || saveShortcut === false) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s") return;
            // Beats the browser's "save page" dialog even from inside an
            // inspector field — ⌘S means the document everywhere in the app.
            event.preventDefault();
            void save();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [enabled, saveShortcut, save]);

    useEffect(() => {
        if (!enabled || warnOnUnload === false || !dirty) return;
        const onBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, [enabled, warnOnUnload, dirty]);

    const status: SaveStatus = saving
        ? "saving"
        : error
          ? "error"
          : dirty
            ? "dirty"
            : savedOnce
              ? "saved"
              : "idle";

    return { status, dirty, saving, error, enabled, save, onDocumentChange };
}
