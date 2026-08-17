"use client";

import type { BuilderDocument } from "@matthiaskrijgsman/mat-builder";
import { EmailBuilder } from "@matthiaskrijgsman/mat-builder/email";
import { EMAIL_SAMPLES } from "./samples";

/*
 * The email builder (docs/06) — the whole editor is <EmailBuilder>: the
 * ./email preset, the docked layout, preview mode and saving. This page is
 * therefore mostly the sample document it opens (./samples).
 */

/** Stand-in for a host's persistence: the playground is a static export with
 * no backend, so "saving" is a round trip to nowhere — enough to exercise the
 * shell's dirty → saving → saved states and the ⌘S shortcut. */
async function saveDocument(document: BuilderDocument): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 700));
    console.info("saved document", document);
}

export default function EmailBuilderPage() {
    const sample = EMAIL_SAMPLES[0];

    return (
        <EmailBuilder
            // The builder is uncontrolled: `defaultValue` is read once at
            // mount. Keying on the sample keeps that honest if a second
            // template (and a picker to switch to it) comes back — a switch
            // must open a fresh instance, as a host does when it loads
            // another document, so history and save state start clean.
            key={sample.id}
            className="h-screen"
            defaultValue={sample.document}
            mergeTags={sample.mergeTags}
            documentName={sample.name}
            onSave={saveDocument}
        />
    );
}
