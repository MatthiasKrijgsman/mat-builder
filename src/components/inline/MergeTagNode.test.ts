import { describe, expect, it } from "vitest";
import {
    $createParagraphNode,
    $createRangeSelection,
    $createTextNode,
    $getNodeByKey,
    $getRoot,
    $setSelection,
    createEditor,
} from "lexical";
import { $createMergeTagNode, $patchSelectedMergeTags, mergeStyleString, MergeTagNode } from "./MergeTagNode.tsx";

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

    it("round-trips the typography style snapshot, omitting it when empty", () => {
        const styled = { type: "merge-tag", version: 1, token: "{{x}}", label: "X", style: "font-size: 24px" };
        const bare = { type: "merge-tag", version: 1, token: "{{y}}", label: "Y" };
        const parsed = editor().parseEditorState(JSON.stringify(state([paragraph([styled, bare])])));
        const json = parsed.toJSON() as { root: { children: Array<{ children: Array<Record<string, unknown>> }> } };
        const [first, second] = json.root.children[0].children;
        expect(first).toMatchObject({ token: "{{x}}", style: "font-size: 24px" });
        expect(second).not.toHaveProperty("style");
    });
});

describe("$patchSelectedMergeTags", () => {
    it("patches merge-tag nodes inside a range selection ($patchStyleText skips them)", () => {
        const instance = createEditor({ nodes: [MergeTagNode], onError: (error) => { throw error; } });
        let tagKey = "";
        instance.update(
            () => {
                const paragraphNode = $createParagraphNode();
                const before = $createTextNode("Hi ");
                const tag = $createMergeTagNode("{{x}}", "X", "font-size: 14px");
                const after = $createTextNode(" there");
                tagKey = tag.getKey();
                paragraphNode.append(before, tag, after);
                $getRoot().append(paragraphNode);
                const selection = $createRangeSelection();
                selection.anchor.set(before.getKey(), 0, "text");
                selection.focus.set(after.getKey(), after.getTextContentSize(), "text");
                $setSelection(selection);
                $patchSelectedMergeTags({ "font-size": "24px" });
            },
            { discrete: true },
        );
        instance.getEditorState().read(() => {
            const tag = $getNodeByKey<MergeTagNode>(tagKey);
            expect(tag?.getStyle()).toBe("font-size: 24px");
        });
    });
});

describe("mergeStyleString", () => {
    it("adds, overwrites and deletes properties", () => {
        expect(mergeStyleString("", { "font-size": "20px" })).toBe("font-size: 20px");
        expect(mergeStyleString("font-size: 16px;color: red", { "font-size": "20px" })).toBe(
            "font-size: 20px;color: red",
        );
        expect(mergeStyleString("font-size: 16px;color: red", { "font-size": null })).toBe("color: red");
    });
});
