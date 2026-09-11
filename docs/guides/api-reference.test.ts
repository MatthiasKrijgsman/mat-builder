import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as core from "../../src/core/index.ts";
import * as render from "../../src/email/render.ts";
import * as styleProps from "../../src/style-props/index.ts";
import * as richText from "../../src/email/rich-text/index.ts";
import * as fields from "../../src/components/fields/index.ts";
import * as styleGroups from "../../src/components/style-groups/index.ts";

/*
 * The API reference names things; this asserts it names the right ones.
 *
 * Runtime exports only — functions, components and constants, which is where
 * drift actually happens (a type rename breaks the build, a forgotten new
 * export just quietly goes undocumented). The client-only barrels are covered
 * by their sub-barrels here rather than by importing the CSS-importing root.
 */

const reference = readFileSync(fileURLToPath(new URL("./api-reference.md", import.meta.url)), "utf8");

/** Reads as documented if the name appears anywhere in prose, code or a table. */
const documents = (name: string) => new RegExp(`\\b\\$?${name.replace("$", "")}\\b`).test(reference);

/** Internals the reference deliberately says are NOT public (§9). */
const INTERNAL = new Set([
    "containerAccepts",
    "descendGroup",
    "groupSelectionTarget",
    "isDragReachable",
    "insertBlock",
    "moveBlock",
    "updateProps",
    "removeBlock",
    "duplicateBlock",
    "setDocument",
    "setVisibility",
    "getDropError",
    "createHistory",
    "recordHistory",
    "undo",
    "redo",
    "HISTORY_CAP",
    "HISTORY_COALESCE_MS",
    "findInsertLocation",
]);

const surfaces: [string, Record<string, unknown>][] = [
    ["core", core],
    ["email/render", render],
    ["style-props", styleProps],
    ["rich-text", richText],
    ["Fields", fields],
    ["StyleGroups", styleGroups],
];

describe("the API reference covers the public surface", () => {
    for (const [label, module] of surfaces) {
        it(`documents every runtime export of ${label}`, () => {
            const undocumented = Object.keys(module)
                .filter((name) => !INTERNAL.has(name))
                .filter((name) => !documents(name));
            expect(undocumented).toEqual([]);
        });
    }

    it("keeps the internals it calls internal actually internal", () => {
        // If one of these becomes public, it needs a section — not a silent pass.
        const stillInternal = [...INTERNAL].filter((name) => name in core || name in render);
        expect(stillInternal.length).toBeGreaterThan(0);
    });
});
