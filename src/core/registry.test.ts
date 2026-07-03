import { describe, expect, it } from "vitest";
import { containerAccepts, createRegistry } from "./registry.ts";
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
