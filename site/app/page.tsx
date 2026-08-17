"use client";

import type { BuilderDocument } from "@matthiaskrijgsman/mat-builder";
import { EmailBuilder } from "@matthiaskrijgsman/mat-builder/email";
import { InputSelect } from "@matthiaskrijgsman/mat-ui";
import { useState } from "react";
import { EMAIL_SAMPLES } from "./samples";

/*
 * The email builder (docs/06) — the whole editor is <EmailBuilder>: the
 * ./email preset, the docked layout, preview mode and saving. This page is
 * therefore mostly the sample documents it opens with (./samples) and the
 * picker that switches between them.
 */

/** Stand-in for a host's persistence: the playground is a static export with
 * no backend, so "saving" is a round trip to nowhere — enough to exercise the
 * shell's dirty → saving → saved states and the ⌘S shortcut. */
async function saveDocument(document: BuilderDocument): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 700));
    console.info("saved document", document);
}

const SAMPLE_OPTIONS = EMAIL_SAMPLES.map((sample) => ({ label: sample.name, value: sample.id }));

export default function EmailBuilderPage() {
    const [sampleId, setSampleId] = useState(EMAIL_SAMPLES[0].id);
    const sample = EMAIL_SAMPLES.find((entry) => entry.id === sampleId) ?? EMAIL_SAMPLES[0];

    return (
        <EmailBuilder
            // The builder is uncontrolled: `defaultValue` is read once at
            // mount, so switching templates opens a fresh instance — which is
            // also what a host does when it loads another document (history
            // and save state start clean).
            key={sample.id}
            className="h-screen"
            defaultValue={sample.document}
            mergeTags={sample.mergeTags}
            documentName={sample.name}
            actions={
                <InputSelect
                    size="sm"
                    options={SAMPLE_OPTIONS}
                    value={sample.id}
                    onChange={(value) => setSampleId(value ?? EMAIL_SAMPLES[0].id)}
                />
            }
            onSave={saveDocument}
        />
    );
}
