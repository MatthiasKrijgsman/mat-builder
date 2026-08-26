"use client";

import type { BuilderDocument } from "@matthiaskrijgsman/mat-builder";
import { EmailBuilder } from "@matthiaskrijgsman/mat-builder/email";
import { Button, Spinner } from "@matthiaskrijgsman/mat-ui";
import { useRef } from "react";
import { heroPattern, productCardBlock } from "./custom";
import { TemplateActions, useTemplateLibrary } from "./templates";

/*
 * The email builder (docs/06) — the whole editor is <EmailBuilder>: the
 * ./email preset, the docked layout, preview mode and saving. This page is
 * therefore the host around it: a template library in localStorage
 * (./templates), the picker and menu that manage it (./templates §actions),
 * and the sample documents a new template can start from (./samples).
 */

// Stable arrays — the provider treats both as fixed configuration.
const CUSTOM_BLOCKS = [productCardBlock];
const PATTERNS = [heroPattern];

export default function EmailBuilderPage() {
    const library = useTemplateLibrary();
    const { templates, openId } = library;
    const open = templates?.find((template) => template.id === openId) ?? null;

    /* The last document this instance reported, so switching template can
     * persist it. The editor unmounts on a switch and takes its pending
     * autosave with it — flushing here is what makes "edit, switch, come
     * back" round trip. */
    const pending = useRef<BuilderDocument | null>(null);

    const flush = () => {
        if (open && pending.current) {
            try {
                library.saveDocument(open.id, pending.current);
            } catch (error) {
                // Nothing left to show it on: the editor whose save state
                // would have reported this is already on its way out.
                console.error("mat-builder playground: could not flush the open template", error);
            }
        }
        pending.current = null;
    };

    if (!templates) {
        // First render happens without localStorage — the playground is a
        // static export, so the library is read after mount.
        return (
            <div className="flex h-screen items-center justify-center">
                <Spinner className="size-6" />
            </div>
        );
    }

    if (!open) return <EmptyLibrary onCreate={() => library.create("Untitled template")} onReset={library.reset} />;

    return (
        <EmailBuilder
            // The builder is uncontrolled: `defaultValue` is read once at
            // mount, so switching templates opens a fresh instance — which is
            // also what a host does when it loads another document (history
            // and save state start clean).
            key={open.id}
            className="h-screen"
            defaultValue={open.document}
            // A consuming project's own extensions (docs/08): a composed
            // block that stays one thing, and a pattern that expands into
            // ordinary blocks on drop. Neither ships an email renderer.
            blocks={CUSTOM_BLOCKS}
            patterns={PATTERNS}
            mergeTags={open.mergeTags}
            documentName={open.name}
            actions={
                <TemplateActions
                    templates={templates}
                    openId={openId}
                    onOpen={(id) => {
                        flush();
                        library.open(id);
                    }}
                    onCreate={(name, sampleId) => {
                        flush();
                        library.create(name, sampleId);
                    }}
                    // Copies what is on screen, not what was last written —
                    // so the copy is the template you are looking at.
                    onDuplicate={(id) => {
                        flush();
                        library.duplicate(id);
                    }}
                    onRename={library.rename}
                    onDelete={(id) => {
                        pending.current = null;
                        library.remove(id);
                    }}
                    onReset={() => {
                        pending.current = null;
                        library.reset();
                    }}
                />
            }
            onChange={(document) => {
                pending.current = document;
            }}
            // A host would round trip to its API here; this one writes to
            // localStorage, which is synchronous — so the save resolves at
            // once and a full quota surfaces as the shell's "Save failed".
            onSave={(document) => library.saveDocument(open.id, document)}
            // Editing an email is long and fiddly enough that losing a
            // session to a forgotten ⌘S would be the playground's most
            // memorable feature. Both still work.
            autoSaveMs={1200}
        />
    );
}

/** Every template deleted — the one state with no document to open. */
function EmptyLibrary({ onCreate, onReset }: { onCreate: () => void; onReset: () => void }) {
    return (
        <div className="flex h-screen flex-col items-center justify-center gap-6 px-6 text-center">
            <div className="flex flex-col gap-1">
                <h1 className="text-lg font-semibold">No templates</h1>
                <p className="text-[var(--color-input-description-text)]">
                    This browser&rsquo;s template library is empty.
                </p>
            </div>
            <div className="flex gap-2">
                <Button variant="primary" onClick={onCreate}>
                    New blank template
                </Button>
                <Button variant="white" onClick={onReset}>
                    Restore the samples
                </Button>
            </div>
        </div>
    );
}
