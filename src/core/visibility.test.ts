import { describe, expect, it } from "vitest";
import { duplicateBlock, setVisibility } from "./commands.ts";
import { block, exampleDoc, testRegistry } from "./test-fixtures.ts";
import type { BlockVisibility } from "./visibility.ts";
import { describeVisibility, evaluateRule, hasVisibilityRules, isBlockVisible, isVisible } from "./visibility.ts";

const rules = (partial: Partial<BlockVisibility>): BlockVisibility => ({
    mode: "rules",
    match: "all",
    rules: [],
    ...partial,
});

describe("evaluateRule", () => {
    const values = { "{{plan}}": "Pro", "{{invoice_url}}": "  ", "{{name}}": "Ada Lovelace" };

    it("tests presence, treating whitespace-only and missing as absent", () => {
        expect(evaluateRule({ token: "{{plan}}", operator: "exists" }, values)).toBe(true);
        expect(evaluateRule({ token: "{{invoice_url}}", operator: "exists" }, values)).toBe(false);
        expect(evaluateRule({ token: "{{nope}}", operator: "exists" }, values)).toBe(false);
        expect(evaluateRule({ token: "{{nope}}", operator: "notExists" }, values)).toBe(true);
    });

    it("compares case-insensitively — merge tag data is not typed by the rule author", () => {
        expect(evaluateRule({ token: "{{plan}}", operator: "eq", value: "pro" }, values)).toBe(true);
        expect(evaluateRule({ token: "{{plan}}", operator: "eq", value: " PRO " }, values)).toBe(true);
        expect(evaluateRule({ token: "{{plan}}", operator: "neq", value: "free" }, values)).toBe(true);
        expect(evaluateRule({ token: "{{name}}", operator: "contains", value: "lovelace" }, values)).toBe(true);
        expect(evaluateRule({ token: "{{name}}", operator: "notContains", value: "turing" }, values)).toBe(true);
    });

    it("never hides on an operator from a newer document", () => {
        expect(evaluateRule({ token: "{{plan}}", operator: "sings" as never }, values)).toBe(true);
    });
});

describe("isVisible", () => {
    const proOnly = rules({ rules: [{ token: "{{plan}}", operator: "eq", value: "Pro" }] });

    it("shows everything when there are no values to decide with", () => {
        expect(isVisible(proOnly, undefined)).toBe(true);
        // An empty SET of values is different — it decides, and decides false.
        expect(isVisible(proOnly, {})).toBe(false);
    });

    it("is unconditional without rules, and in `always` mode", () => {
        expect(isVisible(undefined, {})).toBe(true);
        expect(isVisible(rules({ rules: [] }), {})).toBe(true);
        expect(isVisible({ ...proOnly, mode: "always" }, {})).toBe(true);
    });

    it("combines rules with all/any", () => {
        const both = [
            { token: "{{plan}}", operator: "eq" as const, value: "Pro" },
            { token: "{{invoice_url}}", operator: "exists" as const },
        ];
        const values = { "{{plan}}": "Pro" };
        expect(isVisible(rules({ match: "all", rules: both }), values)).toBe(false);
        expect(isVisible(rules({ match: "any", rules: both }), values)).toBe(true);
    });

    it("treats a missing node as not visible", () => {
        expect(isBlockVisible(undefined, {})).toBe(false);
        expect(isBlockVisible(block({ id: "t1", type: "text" }), {})).toBe(true);
    });
});

describe("hasVisibilityRules", () => {
    it("only counts rules that can actually hide the block", () => {
        expect(hasVisibilityRules(undefined)).toBe(false);
        expect(hasVisibilityRules(rules({ rules: [] }))).toBe(false);
        expect(hasVisibilityRules({ ...rules({ rules: [{ token: "a", operator: "exists" }] }), mode: "always" })).toBe(false);
        expect(hasVisibilityRules(rules({ rules: [{ token: "a", operator: "exists" }] }))).toBe(true);
    });
});

describe("setVisibility", () => {
    const visibility = rules({ rules: [{ token: "{{plan}}", operator: "exists" }] });

    it("sets and clears the node field", () => {
        const set = setVisibility(exampleDoc(), { id: "t1", visibility });
        expect(set.blocks.t1.visibility).toEqual(visibility);
        expect(setVisibility(set, { id: "t1", visibility: undefined }).blocks.t1.visibility).toBeUndefined();
    });

    it("refuses the root and unknown blocks", () => {
        expect(() => setVisibility(exampleDoc(), { id: "root", visibility })).toThrow(/root block/);
        expect(() => setVisibility(exampleDoc(), { id: "nope", visibility })).toThrow(/does not exist/);
    });

    it("survives a duplicate — the clone keeps its conditions", () => {
        const document = setVisibility(exampleDoc(), { id: "t1", visibility });
        const { document: next, blockId } = duplicateBlock(document, { id: "t1" }, testRegistry);
        expect(next.blocks[blockId].visibility).toEqual(visibility);
        // Deep-cloned, not shared with the source node
        expect(next.blocks[blockId].visibility).not.toBe(next.blocks.t1.visibility);
    });
});

describe("describeVisibility", () => {
    const labelOf = (token: string) => (token === "{{plan}}" ? "Plan" : token);

    it("reads as a sentence, resolving tokens to their labels", () => {
        const summary = describeVisibility(
            rules({
                rules: [
                    { token: "{{plan}}", operator: "eq", value: "Pro" },
                    { token: "{{invoice_url}}", operator: "exists" },
                ],
            }),
            labelOf,
        );
        expect(summary).toBe("Shown when Plan is \u201cPro\u201d and {{invoice_url}} is provided");
    });

    it("joins with `or` in any-match mode", () => {
        const summary = describeVisibility(
            rules({ match: "any", rules: [{ token: "{{plan}}", operator: "notExists" }, { token: "{{plan}}", operator: "contains", value: "ent" }] }),
            labelOf,
        );
        expect(summary).toBe("Shown when Plan is empty or Plan contains \u201cent\u201d");
    });

    it("is empty when nothing can hide the block", () => {
        expect(describeVisibility(undefined, labelOf)).toBe("");
        expect(describeVisibility(rules({ rules: [] }), labelOf)).toBe("");
        expect(describeVisibility({ ...rules({ rules: [{ token: "{{plan}}", operator: "exists" }] }), mode: "always" }, labelOf)).toBe("");
    });
});
