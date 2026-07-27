import { describe, expect, it } from "vitest";
import { descendGroup, groupSelectionTarget, isDragReachable } from "./selection.ts";

/*
 * Group selection (docs/04 §Selection) — the rule the canvas uses to decide
 * what a click, a hover and a drag inside a composite block target.
 */

describe("descendGroup", () => {
    it("gives children no group when the block is not a group root", () => {
        expect(descendGroup(undefined, "block", false, false)).toBeUndefined();
    });

    it("makes a group root the group for its children", () => {
        expect(descendGroup(undefined, "table", true, false)).toEqual({ id: "table", entered: false });
    });

    it("keeps the OUTERMOST group when groups nest", () => {
        const outer = { id: "outer", entered: false };
        // A nested group is just part of its parent until the parent is entered
        expect(descendGroup(outer, "inner", true, true)).toBe(outer);
    });

    it("passes the inherited group down through non-group blocks", () => {
        const group = { id: "table", entered: true };
        expect(descendGroup(group, "row", false, false)).toBe(group);
    });
});

describe("groupSelectionTarget", () => {
    it("selects the block itself when it is in no group", () => {
        expect(groupSelectionTarget("cell", undefined)).toBe("cell");
    });

    it("selects the GROUP when the group has not been entered", () => {
        expect(groupSelectionTarget("cell", { id: "table", entered: false })).toBe("table");
    });

    it("selects the block itself once the group is entered", () => {
        expect(groupSelectionTarget("cell", { id: "table", entered: true })).toBe("cell");
    });
});

describe("isDragReachable", () => {
    it("matches the selection rule exactly — you drag what a click selects", () => {
        for (const group of [undefined, { id: "table", entered: false }, { id: "table", entered: true }]) {
            expect(isDragReachable("cell", group)).toBe(groupSelectionTarget("cell", group) === "cell");
        }
    });

    it("locks descendants of an un-entered group so the drag falls through to it", () => {
        expect(isDragReachable("cell", { id: "table", entered: false })).toBe(false);
    });

    it("never locks the group root itself (its own group context is the OUTER one)", () => {
        expect(isDragReachable("table", undefined)).toBe(true);
    });
});
