import {
    createDocument,
    createRegistry,
    migrateDocument,
    validateDocument,
    type BuilderDocument,
    type MergeTag,
} from "@matthiaskrijgsman/mat-builder";
import { emailBlocks, EMAIL_ROOT_TYPE } from "@matthiaskrijgsman/mat-builder/email";
import { EMAIL_SAMPLES } from "../samples";
import type { StoredTemplate } from "./types";

/*
 * localStorage standing in for a host's backend. Everything here is browser
 * only — the playground is a static export, so no module-level call may touch
 * `window` (see ./use-template-library, which reads the store after mount).
 *
 * The read path deliberately treats storage as untrusted: a document that has
 * been sitting in a browser since an older release is in exactly the position
 * a document coming back from an API is, so it goes through `migrateDocument`
 * and `validateDocument` before the builder ever sees it.
 */

const LIBRARY_KEY = "mat-builder.playground.templates.v1";
const OPEN_KEY = "mat-builder.playground.open-template.v1";

/** What loaded documents are validated against — this playground edits emails,
 * so the email preset is the whole vocabulary a stored document may use. */
const registry = createRegistry(emailBlocks);

/** Tokens a blank template starts with. The samples ship their own set, which
 * a copy made from one inherits (./types §mergeTags). */
export const DEFAULT_MERGE_TAGS: MergeTag[] = [
    { token: "{{first_name}}", label: "First name", group: "Contact" },
    { token: "{{last_name}}", label: "Last name", group: "Contact" },
    { token: "{{email}}", label: "Email address", group: "Contact" },
    { token: "{{company}}", label: "Company", group: "Contact" },
    { token: "{{unsubscribe_url}}", label: "Unsubscribe URL" },
];

function createId(): string {
    // randomUUID needs a secure context, which localhost and the deployed site
    // both are — the fallback is only there so an insecure origin still works.
    return globalThis.crypto?.randomUUID?.() ?? `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/* ── Creating ───────────────────────────────────────────────────────────── */

/**
 * A new template: a blank document (the email root's `onCreate` seeds it with
 * one white container) or a copy of one of the built-in samples.
 */
export function createTemplate(name: string, sampleId?: string): StoredTemplate {
    const sample = sampleId ? EMAIL_SAMPLES.find((entry) => entry.id === sampleId) : undefined;
    return {
        id: createId(),
        name,
        mergeTags: sample?.mergeTags ?? DEFAULT_MERGE_TAGS,
        // The samples are module constants every copy would otherwise share.
        // The builder never mutates a document in place, but a copy that is
        // about to be edited and stored on its own is cloned regardless.
        document: sample ? structuredClone(sample.document) : createDocument(registry, EMAIL_ROOT_TYPE),
    };
}

export function duplicateTemplate(template: StoredTemplate, name: string): StoredTemplate {
    return { ...template, id: createId(), name, document: structuredClone(template.document) };
}

/** A fresh library: the built-in samples as ordinary, editable templates. */
export function seedLibrary(): StoredTemplate[] {
    return EMAIL_SAMPLES.map((sample) => createTemplate(sample.name, sample.id));
}

/* ── Reading & writing ──────────────────────────────────────────────────── */

/** The stored library, or null when this browser has never opened the
 * playground — the caller seeds the samples in that case. An empty array is a
 * different answer: someone deleted every template, and gets the empty state. */
export function readLibrary(): StoredTemplate[] | null {
    let raw: string | null;
    try {
        raw = window.localStorage.getItem(LIBRARY_KEY);
    } catch (error) {
        // Storage can be denied outright (Safari's private mode, blocked
        // third-party cookies in an iframe). The playground still works —
        // it just forgets everything on reload.
        console.warn("mat-builder playground: localStorage is unavailable", error);
        return null;
    }
    if (raw === null) return null;

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch (error) {
        console.warn("mat-builder playground: stored templates are not valid JSON — starting over", error);
        return null;
    }
    if (!Array.isArray(parsed)) return null;
    return parsed.map(parseTemplate).filter((template): template is StoredTemplate => template !== null);
}

/** Persists the whole library. Deliberately throws — a full quota is a real
 * save failure, and the shell's save state is where the user should see it. */
export function writeLibrary(templates: StoredTemplate[]): void {
    window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(templates));
}

/** Which template was open, so a reload comes back to it. Failing to remember
 * it is not worth surfacing — the picker just falls back to the first one. */
export function readOpenId(): string | null {
    try {
        return window.localStorage.getItem(OPEN_KEY);
    } catch {
        return null;
    }
}

export function writeOpenId(id: string | null): void {
    try {
        if (id === null) window.localStorage.removeItem(OPEN_KEY);
        else window.localStorage.setItem(OPEN_KEY, id);
    } catch {
        /* remembering the open template is a nicety, not a feature */
    }
}

/**
 * One entry as it came back from storage. Anything unreadable is dropped with
 * a warning rather than thrown: one corrupt template must not cost the user
 * the rest of the library.
 */
function parseTemplate(value: unknown): StoredTemplate | null {
    if (typeof value !== "object" || value === null) return null;
    const record = value as Record<string, unknown>;
    const { id, name, document } = record;
    if (typeof id !== "string" || typeof name !== "string" || typeof document !== "object" || document === null) {
        return null;
    }

    let migrated: BuilderDocument;
    try {
        migrated = migrateDocument(document as BuilderDocument);
    } catch (error) {
        console.warn(`mat-builder playground: dropping template "${name}" — it cannot be migrated`, error);
        return null;
    }

    // Warnings are tolerated by design (an unknown block type renders as a
    // missing block rather than losing the document); errors are not.
    const errors = validateDocument(migrated, registry).filter((issue) => issue.severity === "error");
    if (errors.length > 0) {
        console.warn(`mat-builder playground: dropping template "${name}" — invalid document`, errors);
        return null;
    }

    return {
        id,
        name,
        mergeTags: Array.isArray(record.mergeTags) ? (record.mergeTags as MergeTag[]) : DEFAULT_MERGE_TAGS,
        document: migrated,
    };
}
