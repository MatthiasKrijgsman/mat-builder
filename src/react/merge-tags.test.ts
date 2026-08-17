import { describe, expect, it } from "vitest";
import { block } from "../core/test-fixtures.ts";
import type { BuilderDocument } from "../core/types.ts";
import { collectMergeTagUsage, type MergeTag } from "./merge-tags.ts";

const tags: MergeTag[] = [
    { token: "{{first_name}}", label: "First name", group: "Contact" },
    { token: "{{plan}}", label: "Plan", group: "Billing", values: ["Free", "Pro"] },
    { token: "*|COMPANY|*", label: "Company" },
    { token: "{{unused}}", label: "Unused" },
];

/** A rich-text prop, the way the Text block stores it. */
const richText = (...nodes: unknown[]) =>
    JSON.stringify({ root: { type: "root", children: [{ type: "paragraph", children: nodes }] } });

const doc = (blocks: BuilderDocument["blocks"]): BuilderDocument => ({ version: 1, rootId: "root", blocks });

describe("collectMergeTagUsage", () => {
    it("finds tags in rich text, plain string props and nested props", () => {
        const document = doc({
            root: block({ id: "root", type: "root", children: { main: ["t1", "b1", "i1"] } }),
            t1: block({
                id: "t1",
                type: "text",
                props: {
                    content: richText(
                        { type: "text", text: "Hi " },
                        { type: "merge-tag", token: "{{first_name}}", label: "First name" },
                    ),
                },
            }),
            b1: block({ id: "b1", type: "button", props: { label: "Open", href: "https://x.test?c=*|COMPANY|*" } }),
            i1: block({ id: "i1", type: "image", props: { size: { alt: "logo for {{plan}}" } } }),
        });

        const usage = collectMergeTagUsage(document, tags);
        expect(usage.map((entry) => entry.tag.token)).toEqual(["{{first_name}}", "{{plan}}", "*|COMPANY|*"]);
        expect(usage.every((entry) => entry.inContent)).toBe(true);
        expect(usage.every((entry) => !entry.inRules)).toBe(true);
    });

    it("includes tags a visibility rule names, and marks how each is used", () => {
        const document = doc({
            root: block({ id: "root", type: "root", children: { main: ["t1"] } }),
            t1: block({
                id: "t1",
                type: "text",
                props: { content: richText({ type: "merge-tag", token: "{{first_name}}", label: "First name" }) },
                visibility: {
                    mode: "rules",
                    match: "all",
                    rules: [
                        { token: "{{plan}}", operator: "eq", value: "Pro" },
                        { token: "{{first_name}}", operator: "exists" },
                    ],
                },
            }),
        });

        const usage = collectMergeTagUsage(document, tags);
        expect(usage).toEqual([
            { tag: tags[0], inContent: true, inRules: true },
            { tag: tags[1], inContent: false, inRules: true },
        ]);
    });

    it("keeps tokens the provider no longer lists, labelled from the document's snapshot", () => {
        const document = doc({
            root: block({ id: "root", type: "root", children: { main: ["t1"] } }),
            t1: block({
                id: "t1",
                type: "text",
                props: { content: richText({ type: "merge-tag", token: "{{retired}}", label: "Retired tag" }) },
                visibility: { mode: "rules", match: "all", rules: [{ token: "{{gone}}", operator: "exists" }] },
            }),
        });

        const usage = collectMergeTagUsage(document, tags);
        expect(usage).toEqual([
            // A rule's unknown token falls back to the token as its own label
            { tag: { token: "{{gone}}", label: "{{gone}}" }, inContent: false, inRules: true },
            { tag: { token: "{{retired}}", label: "Retired tag" }, inContent: true, inRules: false },
        ]);
    });

    it("reports each tag once and ignores malformed content", () => {
        const document = doc({
            root: block({ id: "root", type: "root", children: { main: ["t1", "t2"] } }),
            t1: block({ id: "t1", type: "text", props: { content: '{ not json at all "merge-tag"' } }),
            t2: block({ id: "t2", type: "button", props: { label: "{{plan}} and {{plan}} again" } }),
        });

        expect(collectMergeTagUsage(document, tags)).toEqual([{ tag: tags[1], inContent: true, inRules: false }]);
    });

    it("is empty for a document with no tags in it", () => {
        const document = doc({ root: block({ id: "root", type: "root", children: { main: [] } }) });
        expect(collectMergeTagUsage(document, tags)).toEqual([]);
    });
});
