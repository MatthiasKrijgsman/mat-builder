import { describe, expect, it } from "vitest";
import { $getRoot, createEditor } from "lexical";
import { MergeTagNode } from "./MergeTagNode.tsx";

/*
 * Serialization round-trip for the merge-tag chip node — parseEditorState and
 * toJSON never touch the DOM, so this runs under plain node like the rest of
 * the suite. The serialized shape must stay compatible with RichMergeTagNode
 * (rich-text/types.ts): the server-safe walker reads exactly these fields.
 */

const state = (children: unknown[]) => ({
    root: { type: "root", version: 1, direction: null, format: "", indent: 0, children },
});

const paragraph = (children: unknown[]) => ({
    type: "paragraph",
    version: 1,
    direction: null,
    format: "",
    indent: 0,
    children,
});

describe("MergeTagNode", () => {
    const editor = () => createEditor({ nodes: [MergeTagNode], onError: (error) => { throw error; } });

    it("round-trips token and label through parseEditorState/toJSON", () => {
        const serialized = { type: "merge-tag", version: 1, token: "{{first_name}}", label: "First name" };
        const parsed = editor().parseEditorState(JSON.stringify(state([paragraph([serialized])])));
        const json = parsed.toJSON() as { root: { children: Array<{ children: unknown[] }> } };
        expect(json.root.children[0].children[0]).toMatchObject({
            type: "merge-tag",
            token: "{{first_name}}",
            label: "First name",
        });
    });

    it("falls back to the token as label for older documents", () => {
        const serialized = { type: "merge-tag", version: 1, token: "*|FNAME|*" };
        const parsed = editor().parseEditorState(JSON.stringify(state([paragraph([serialized])])));
        const json = parsed.toJSON() as { root: { children: Array<{ children: unknown[] }> } };
        expect(json.root.children[0].children[0]).toMatchObject({ token: "*|FNAME|*", label: "*|FNAME|*" });
    });

    it("projects the literal token as text content (plain-text copy)", () => {
        const content = state([paragraph([{ type: "merge-tag", version: 1, token: "{{x}}", label: "X" }])]);
        const parsed = editor().parseEditorState(JSON.stringify(content));
        const text = parsed.read(() => $getRoot().getTextContent());
        expect(text).toBe("{{x}}");
    });
});
