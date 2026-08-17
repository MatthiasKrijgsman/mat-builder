import type { BuilderDocument } from "../core/types.ts";

/*
 * Merge tags — consumer-provided personalization tokens (docs/06 §merge tags).
 * The library never assumes a delimiter syntax: each tag carries the literal
 * token string its ESP expects, and the exported HTML emits it verbatim.
 * Inserted tags snapshot their token/label into the document, so rendering
 * never depends on the provider's current tag list.
 */

export interface MergeTag {
    /** The literal token emitted into the exported HTML — e.g. `{{first_name}}` or `*|FNAME|*`. */
    token: string;
    /** Human-readable name shown in insert menus and on canvas chips. */
    label: string;
    /** Optional group name — tags sharing one render under a labeled section
     * in the insert menu. Sections (and ungrouped tags) keep the order of
     * their first appearance in the provider's tag list. */
    group?: string;
    /**
     * The values this tag can take, when the host knows them (a plan name, a
     * locale, a status). Visibility rules and the preview-data panel offer
     * them as a dropdown instead of a free-text field; omit for open-ended
     * tags like a first name — those stay free text everywhere.
     */
    values?: string[];
}

/** One tag a template actually uses, with where it turned up. */
export interface MergeTagUsage {
    /** The provider's tag when it still lists this token, else a stand-in
     * whose `label` is the token itself (documents outlive tag lists). */
    tag: MergeTag;
    /** Appears in block content — rich text, a label, a link */
    inContent: boolean;
    /** Tested by at least one block's visibility rules */
    inRules: boolean;
}

/** Walks nested prop values, yielding every string found. */
function* strings(value: unknown): Generator<string> {
    if (typeof value === "string") {
        yield value;
        return;
    }
    if (Array.isArray(value)) {
        for (const entry of value) yield* strings(entry);
        return;
    }
    if (value && typeof value === "object") {
        for (const entry of Object.values(value)) yield* strings(entry);
    }
}

/** Merge-tag nodes buried in a serialized rich-text prop (`{ type: "merge-tag", token, label }`). */
function* richTextTags(node: unknown): Generator<{ token: string; label?: string }> {
    if (Array.isArray(node)) {
        for (const entry of node) yield* richTextTags(entry);
        return;
    }
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    if (record.type === "merge-tag" && typeof record.token === "string") {
        yield { token: record.token, label: typeof record.label === "string" ? record.label : undefined };
    }
    for (const entry of Object.values(record)) yield* richTextTags(entry);
}

/**
 * Which merge tags a document actually uses — what the preview-data panel
 * asks the user to fill in (docs/06 §Preview data).
 *
 * Content hits are found by scanning every string prop for each configured
 * token, which covers rich text for free (a `MergeTagNode` serializes its
 * token into `props.content`'s JSON) as well as plain-string props like a
 * button's label or href — and works the same for a consumer's own blocks,
 * since it never assumes a prop shape. Tags that a document snapshot still
 * carries but the provider no longer lists are picked up from the rich-text
 * nodes themselves, so a stale token can still be given a preview value.
 *
 * Result order follows `tags`, with unlisted tokens appended.
 */
export function collectMergeTagUsage(document: BuilderDocument, tags: MergeTag[]): MergeTagUsage[] {
    const byToken = new Map<string, MergeTagUsage>();
    const record = (tag: MergeTag, where: "inContent" | "inRules"): void => {
        const existing = byToken.get(tag.token);
        if (existing) existing[where] = true;
        else byToken.set(tag.token, { tag, inContent: where === "inContent", inRules: where === "inRules" });
    };
    const known = new Map(tags.map((tag) => [tag.token, tag]));

    for (const node of Object.values(document.blocks)) {
        for (const rule of node.visibility?.rules ?? []) {
            record(known.get(rule.token) ?? { token: rule.token, label: rule.token }, "inRules");
        }
        for (const text of strings(node.props)) {
            for (const tag of tags) {
                if (text.includes(tag.token)) record(tag, "inContent");
            }
            // Snapshot-only tags: parse strings that could be stored rich text.
            if (!(text.startsWith("{") && text.includes('"merge-tag"'))) continue;
            let parsed: unknown;
            try {
                parsed = JSON.parse(text);
            } catch {
                continue;
            }
            for (const found of richTextTags(parsed)) {
                if (known.has(found.token)) continue; // already covered by the scan above
                record({ token: found.token, label: found.label || found.token }, "inContent");
            }
        }
    }

    // Provider order first (the order the host chose), then anything unlisted.
    const ordered = tags.map((tag) => byToken.get(tag.token)).filter((usage) => usage !== undefined);
    const listed = new Set(tags.map((tag) => tag.token));
    return [...ordered, ...[...byToken.values()].filter((usage) => !listed.has(usage.tag.token))];
}
