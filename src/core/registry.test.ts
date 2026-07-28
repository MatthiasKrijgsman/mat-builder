import { describe, expect, it } from "vitest";
import { containerAccepts, createRegistry, mergeBlockDefinitions } from "./registry.ts";
import { exampleDoc, sectionBlock, testRegistry, textBlock } from "./test-fixtures.ts";

describe("createRegistry", () => {
    it("looks definitions up by type", () => {
        expect(testRegistry.getDefinition("text")).toBe(textBlock);
        expect(testRegistry.has("section")).toBe(true);
        expect(testRegistry.definitions).toContain(sectionBlock);
    });

    it("tolerates unknown types by returning undefined", () => {
        expect(testRegistry.getDefinition("legacy-hero")).toBeUndefined();
        expect(testRegistry.has("legacy-hero")).toBe(false);
    });

    it("throws on duplicate types", () => {
        expect(() => createRegistry([textBlock, textBlock])).toThrow(/duplicate block type "text"/);
    });
});

describe("mergeBlockDefinitions", () => {
    const customText = { ...textBlock, label: "Custom text" };
    const heroBlock = { ...sectionBlock, type: "hero", label: "Hero" };

    it("returns the base set when there is nothing to merge", () => {
        expect(mergeBlockDefinitions([textBlock, sectionBlock])).toEqual([textBlock, sectionBlock]);
        expect(mergeBlockDefinitions([textBlock], [])).toEqual([textBlock]);
    });

    it("appends new types", () => {
        expect(mergeBlockDefinitions([textBlock], [heroBlock])).toEqual([textBlock, heroBlock]);
    });

    it("replaces a matching type in place, keeping palette order", () => {
        expect(mergeBlockDefinitions([textBlock, sectionBlock], [customText])).toEqual([customText, sectionBlock]);
    });

    it("produces a registry-safe list (no duplicates) even for repeated overrides", () => {
        const merged = mergeBlockDefinitions([textBlock], [customText, { ...customText, label: "Last wins" }]);
        expect(merged).toHaveLength(1);
        expect(merged[0].label).toBe("Last wins");
        expect(() => createRegistry(merged)).not.toThrow();
    });

    it("does not mutate the base set", () => {
        const base = [textBlock];
        mergeBlockDefinitions(base, [customText, heroBlock]);
        expect(base).toEqual([textBlock]);
    });
});

describe("containerAccepts", () => {
    const ctx = { document: exampleDoc(), parentId: "sec1", container: "body" };

    it("accepts everything when the rule is omitted", () => {
        expect(containerAccepts({ name: "main", layout: "vertical" }, "anything", ctx)).toBe(true);
    });

    it("checks the array form", () => {
        const container = { name: "body", layout: "vertical", accepts: ["text"] } as const;
        expect(containerAccepts(container, "text", ctx)).toBe(true);
        expect(containerAccepts(container, "button", ctx)).toBe(false);
    });

    it("checks the function form with context", () => {
        const container = {
            name: "body",
            layout: "vertical",
            accepts: (childType: string, { container }: { container: string }) =>
                childType === "text" && container === "body",
        } as const;
        expect(containerAccepts(container, "text", ctx)).toBe(true);
        expect(containerAccepts(container, "button", ctx)).toBe(false);
    });
});
