"use client";

import type { BuilderDocument } from "@matthiaskrijgsman/mat-builder";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    createTemplate,
    duplicateTemplate,
    readLibrary,
    readOpenId,
    seedLibrary,
    writeLibrary,
    writeOpenId,
} from "./storage";
import type { StoredTemplate } from "./types";

/*
 * The template library as React state, backed by localStorage (./storage).
 * This is the piece a host would replace with its API client — the page below
 * only ever sees a list, an open id, and the handful of operations here.
 */

export interface TemplateLibrary {
    /** Null until the store has been read. The playground is statically
     * exported, so the first render — prerendered at build time, then
     * hydrated — happens before any localStorage access is legal; the page
     * shows a placeholder until this fills in. */
    templates: StoredTemplate[] | null;
    openId: string | null;
    open: (id: string) => void;
    /** Creates a blank template, or a copy of a built-in sample, and opens it */
    create: (name: string, sampleId?: string) => void;
    duplicate: (id: string) => void;
    rename: (id: string, name: string) => void;
    remove: (id: string) => void;
    /** Persists an edited document — wired into the builder's `onSave`, and so
     * the one operation here that lets a storage failure through (the shell
     * turns a rejected save into its "Save failed" state). */
    saveDocument: (id: string, document: BuilderDocument) => void;
    /** Throws the library away and seeds the samples again */
    reset: () => void;
}

export function useTemplateLibrary(): TemplateLibrary {
    const [templates, setTemplates] = useState<StoredTemplate[] | null>(null);
    const [openId, setOpenId] = useState<string | null>(null);

    // Every operation derives the next library from the current one, and both
    // `onSave` and the menu callbacks can be holding a render-old `templates`.
    // The ref is the single current copy they all read.
    const latest = useRef<StoredTemplate[]>([]);

    const apply = useCallback((next: StoredTemplate[]) => {
        latest.current = next;
        setTemplates(next);
    }, []);

    /** Writes, then adopts — so a rejected write leaves the UI showing what is
     * actually stored, and the caller knows not to open a template that never
     * made it. `saveDocument` is the exception and rethrows instead. */
    const commit = useCallback(
        (next: StoredTemplate[]) => {
            try {
                writeLibrary(next);
            } catch (error) {
                console.error("mat-builder playground: could not store the template library", error);
                return false;
            }
            apply(next);
            return true;
        },
        [apply],
    );

    const open = useCallback((id: string) => {
        setOpenId(id);
        writeOpenId(id);
    }, []);

    useEffect(() => {
        const stored = readLibrary();
        const initial = stored ?? seedLibrary();
        apply(initial);
        // A first visit persists the seed straight away, so the samples become
        // the user's own copies rather than being re-seeded on every reload.
        if (!stored) {
            try {
                writeLibrary(initial);
            } catch (error) {
                console.warn("mat-builder playground: could not store the seeded templates", error);
            }
        }
        const remembered = readOpenId();
        const openable = initial.some((template) => template.id === remembered) ? remembered : null;
        setOpenId(openable ?? initial[0]?.id ?? null);
    }, [apply]);

    const create = useCallback(
        (name: string, sampleId?: string) => {
            const template = createTemplate(name, sampleId);
            if (commit([...latest.current, template])) open(template.id);
        },
        [commit, open],
    );

    const duplicate = useCallback(
        (id: string) => {
            const source = latest.current.find((template) => template.id === id);
            if (!source) return;
            const copy = duplicateTemplate(source, `${source.name} copy`);
            // Next to its original rather than at the end — the picker keeps
            // insertion order, so a duplicate should land where you made it.
            const index = latest.current.indexOf(source);
            const next = [...latest.current.slice(0, index + 1), copy, ...latest.current.slice(index + 1)];
            if (commit(next)) open(copy.id);
        },
        [commit, open],
    );

    const rename = useCallback(
        (id: string, name: string) => {
            commit(latest.current.map((template) => (template.id === id ? { ...template, name } : template)));
        },
        [commit],
    );

    const remove = useCallback(
        (id: string) => {
            const index = latest.current.findIndex((template) => template.id === id);
            if (index === -1) return;
            const next = latest.current.filter((template) => template.id !== id);
            if (!commit(next)) return;
            // Deleting the open template opens its neighbour — the one that
            // took its place, or the new last one when it was at the end.
            if (id === openId) {
                const neighbour = next[Math.min(index, next.length - 1)];
                if (neighbour) open(neighbour.id);
                else {
                    setOpenId(null);
                    writeOpenId(null);
                }
            }
        },
        [commit, open, openId],
    );

    const saveDocument = useCallback(
        (id: string, document: BuilderDocument) => {
            const next = latest.current.map((template) => (template.id === id ? { ...template, document } : template));
            // Unguarded on purpose: a full quota has to reach the save handler.
            writeLibrary(next);
            apply(next);
        },
        [apply],
    );

    const reset = useCallback(() => {
        const seeded = seedLibrary();
        if (commit(seeded) && seeded[0]) open(seeded[0].id);
    }, [commit, open]);

    return { templates, openId, open, create, duplicate, rename, remove, saveDocument, reset };
}
